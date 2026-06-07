# 数字控制双向DC-DC变换器

## 1. 项目背景

本项目为储能电池系统设计双向 DC-DC 变换器，实现电池与直流母线之间的能量双向流动。Buck 模式将 48V 母线降压为电池充电 (CC-CV)；Boost 模式将电池能量回馈至母线。目标应用：48V 家庭储能系统，电池组电压范围 40V~58.4V (16S LiFePO4)。

| 参数 | 指标 |
|------|------|
| 高压侧 (母线) | 48V DC (42~54V) |
| 低压侧 (电池) | 40V ~ 58.4V DC |
| 额定功率 | 3.3kW |
| 开关频率 | 100 kHz |
| Buck 模式 | CC 充电 (0~60A) → CV 充电 (58.4V) |
| Boost 模式 | 恒功率放电，支持母线稳压 |
| 效率 | > 97% (双向) |
| 主控芯片 | TMS320F280049C |

## 2. 拓扑与工作原理

采用**同步整流 Buck-Boost 双向拓扑**，本质上是一个四开关 Buck-Boost 结构。通过切换开关的逻辑角色，可以在 Buck（降压充电）和 Boost（升压放电）之间平滑切换：

- **Buck 模式**（充电）：Q1 为主开关，Q2 为同步整流管。能量从母线流向电池。
- **Boost 模式**（放电）：Q2 为主开关，Q1 为同步整流管。能量从电池流向母线。

两种模式共用功率级硬件，仅控制逻辑和 PWM 调制方式不同，实现了真正的双向能量流动。

## 3. 硬件设计

### 3.1 功率器件

- MOSFET: BSC040N10NS5 × 4 (100V/100A, 4mΩ)
- 驱动: Si8271 隔离半桥驱动 × 2
- 电感: 铁硅铝磁环 (KS184-060A)，28μH @ 70A，饱和 > 85A

### 3.2 电流采样

使用双向电流检测方案：10mΩ 采样电阻 + INA240 双向电流检测放大器（支持 -80A ~ +80A）。INA240 输出偏置在 1.65V (3.3V/2)，零电流时为中点，正负电流线性对应。

### 3.3 电池侧保护

- 输入保险丝 (80A)
- 反接保护：理想二极管控制器 (LM74700) + N-MOSFET
- 预充电电路：继电器 + PTC，限制上电冲击电流

## 4. 数字控制策略

### 4.1 模式切换

双向变换器的核心挑战是**充放电模式之间的平滑切换**。采用以下状态机：

```c
typedef enum {
    MODE_IDLE,        // 待机
    MODE_BUCK_CC,     // 恒流充电
    MODE_BUCK_CV,     // 恒压充电
    MODE_BOOST_CP,    // 恒功率放电
    MODE_BOOST_CV,    // 母线恒压
    MODE_FAULT        // 故障
} Converter_Mode;

void Mode_Manager(void) {
    switch (mode) {
    case MODE_IDLE:
        if (charge_cmd && Vbat < Vfloat) mode = MODE_BUCK_CC;
        if (discharge_cmd && Vbus < Vbus_min) mode = MODE_BOOST_CV;
        break;

    case MODE_BUCK_CC:
        if (Vbat >= Vfloat) mode = MODE_BUCK_CV;  // CC→CV 切换
        if (discharge_cmd) mode = MODE_BOOST_CP;   // 充电→放电
        break;

    case MODE_BUCK_CV:
        if (Icharge < Iterm) mode = MODE_IDLE;     // 充电终止
        break;

    // ... 其他状态转换
    }
}
```

### 4.2 平滑切换技术

在 Buck ↔ Boost 模式切换瞬间，通过以下方式避免电流/电压冲击：

- **积分器预装载**：切换前将 PI 积分器设为当前占空比对应的积分值
- **占空比连续**：确保切换前后占空比没有跳变
- **电流参考值斜坡**：切换后电流参考值从当前值斜坡过渡到目标值（斜率 10A/ms）

```c
// 模式切换时的 PI 预装载
void Switch_Mode(Converter_Mode new_mode) {
    // 保存当前占空比
    float current_duty = pwm_duty;

    // 切换 PI 参数集
    PI_LoadGains(&pi, gains_LUT[new_mode]);

    // 预装载积分器，保持占空比连续
    pi.integral = current_duty - pi.Kp * pi.prev_error;

    // 设置电流参考斜坡起点为当前电流
    Iref_ramp_start = I_actual;
    Iref_ramp_target = Iref_LUT[new_mode];
    Iref_ramp_counter = 0;

    mode = new_mode;
}
```

### 4.3 充电曲线

支持标准 CC-CV 充电曲线。恒流阶段电流 60A，电压升至 58.4V 后自动切换为恒压模式，电流逐渐下降至终止电流 (3A) 后停止充电。

## 5. 测试数据

| 测试项目 | 结果 |
|----------|------|
| Buck 满载效率 (48V→54V/60A) | 97.6% |
| Boost 满载效率 (54V→48V/60A) | 97.3% |
| Buck→Boost 切换时间 | < 5ms |
| 模式切换电压过冲 | < 2V |
| CC-CV 切换平滑度 | 无过冲，平滑过渡 |
| 待机功耗 | 2.3W |

## 6. 问题总结

### 问题 1: 电池反接烧毁

调试时因电池极性接反，瞬间烧毁一颗 MOSFET。
**改进**：增加反接保护电路（理想二极管 + 防反接 MOSFET），并在固件中加入电池电压极性检测。

### 问题 2: 模式切换瞬间母线电压跌落

Boost→Buck 切换瞬间，母线电压瞬间跌落约 8V，导致后级设备重启。
**改进**：在 PI 预装载基础上，增加 500μs 的重叠区（在此期间两个 PI 同时计算，加权过渡）。

## 7. 总结

本项目实现了一款 3.3kW 数字控制双向 DC-DC 变换器，支持 Buck 充电和 Boost 放电的平滑在线切换。双向运行的核心在于状态机设计、PI 积分器预装载和电流参考斜坡过渡。该变换器已集成到 48V 家庭储能系统中，运行稳定。
