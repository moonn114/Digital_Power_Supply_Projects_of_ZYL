# 基于STM32的数字DC-DC降压变换器设计

## 1. 项目背景与需求

本项目旨在设计一款高性能数字控制 Buck 降压变换器，用于实验室通用直流电源。相比传统模拟控制方案，数字控制具有灵活性强、可在线调参、支持复杂控制算法等优势。

| 参数 | 指标 |
|------|------|
| 输入电压 | 24V ~ 48V DC |
| 输出电压 | 0 ~ 20V 可调 |
| 最大输出电流 | 10A |
| 开关频率 | 200 kHz |
| 控制模式 | 恒压 (CV) / 恒流 (CC) |
| 峰值效率 | 94% |
| 主控芯片 | STM32F334R8T6 |

## 2. 拓扑选择与方案设计

选用**同步整流 Buck** 拓扑，上下管均使用 N-MOSFET，相比异步 Buck 在满载时效率可提升约 3-5%。系统架构如下：

- **功率级**：同步 Buck 拓扑，SiC MOSFET (BSC040N10NS5)
- **驱动**：隔离半桥驱动芯片 Si8271，带死区时间硬件保护
- **采样**：输出电流经 5mΩ 采样电阻 + INA282 电流检测放大器；输出电压经电阻分压直接进 ADC
- **控制**：STM32F334 内置高分辨率定时器 (HRTIM) 产生 PWM，片内 12-bit ADC 同步采样
- **辅助电源**：12V 从输入取电的 Buck 辅助电源 (MP2459)

## 3. 硬件设计要点

### 3.1 功率电感设计

电感值按 30% 纹波电流设计（满载 10A）：

```
L = (Vin_max - Vout) × Vout / (Vin_max × fsw × ΔIL)
  = (48 - 12) × 12 / (48 × 200k × 3)
  ≈ 15 μH
```

选用铁硅铝磁环 (KS106-125A)，22 匝，实测 15.2μH @ 10A，饱和电流 > 18A。

### 3.2 输出电容选择

输出纹波目标 < 50mVpp。ESR 引起的纹波为主导：

```
ΔVout(ESR) = ΔIL × ESR
ESR_max = 50mV / 3A ≈ 16.7 mΩ
```

采用 4 颗 47μF MLCC (X7R) + 2 颗 330μF 固态电解并联，总 ESR 约 6mΩ。

### 3.3 PCB Layout 注意事项

- 功率回路面积最小化：输入电容 → 上管 → 下管 → 地，环路面积 < 1cm²
- 开关节点 (SW) 铜皮面积尽量小，减少 EMI
- 模拟地与功率地单点连接（在采样电阻 GND 端汇合）
- Gate 驱动走线短且宽，源极开尔文连接

## 4. 数字控制策略

### 4.1 控制架构

采用**电压外环 + 电流内环**的双环 PI 控制结构。外环决定电流参考值，内环实现逐周期电流调节。双环结构在负载突变时响应更快，且天然支持限流保护。

### 4.2 PID 数字实现

使用并联型 PI 离散化（后向欧拉），带抗积分饱和 (Anti-windup)：

```c
// 并联型 PI 控制器，带抗积分饱和
typedef struct {
    float Kp;           // 比例增益
    float Ki;           // 积分增益
    float Kc;           // 抗积分饱和系数
    float integral;     // 积分项
    float out_max;      // 输出上限
    float out_min;      // 输出下限
    float prev_error;   // 上次误差
} PI_Controller;

float PI_Update(PI_Controller *pi, float setpoint, float feedback) {
    float error = setpoint - feedback;

    // 比例项
    float p_term = pi->Kp * error;

    // 积分项（梯形积分）
    pi->integral += pi->Ki * (error + pi->prev_error) * 0.5f * Ts;

    // 计算总输出
    float output = p_term + pi->integral;

    // 输出限幅 + 抗积分饱和
    if (output > pi->out_max) {
        output = pi->out_max;
        pi->integral -= pi->Kc * (output - pi->out_max); // back-calculation
    } else if (output < pi->out_min) {
        output = pi->out_min;
        pi->integral -= pi->Kc * (output - pi->out_min);
    }

    pi->prev_error = error;
    return output;
}
```

### 4.3 HRTIM 配置

STM32F334 的 HRTIM 提供 217ps 分辨率，200kHz 开关频率下占空比分辨率约 15.5 bits。配置为互补输出 + 死区插入：

```c
// HRTIM 初始化关键配置
HRTIM_TimeBaseCfgTypeDef tb = {0};
tb.Period = 720;           // 200kHz @ 144MHz: 144M/200k = 720
tb.PrescalerRatio = HRTIM_PRESCALERRATIO_DIV1;
tb.Mode = HRTIM_MODE_CONTINUOUS;
HAL_HRTIM_TimeBaseConfig(&hhrtim, HRTIM_TIMERINDEX_TIMER_A, &tb);

// 互补输出 + 死区
HRTIM_OutputCfgTypeDef out = {0};
out.Polarity = HRTIM_OUTPUTPOLARITY_HIGH;
out.SetSource = HRTIM_OUTPUTSET_TIMCMP1;
out.ResetSource = HRTIM_OUTPUTRESET_TIMCMP2;
out.DeadTimeInsertion = HRTIM_OUTPUTDEADTIME_INSERTION_ENABLED;
// 死区时间 50ns
HAL_HRTIM_WaveformOutputConfig(&hhrtim, HRTIM_TIMERINDEX_TIMER_A,
                                 HRTIM_OUTPUT_TA1, &out);
```

### 4.4 ADC 同步采样

ADC 由 HRTIM 的 CMP4 事件触发，在 PWM 周期中点采样（平均电流法），避免开关噪声干扰。

### 4.5 软启动与模式切换

输出电压从 0V 线性斜坡至目标值，斜率 1V/ms。CV/CC 模式通过比较误差自动切换 —— 当电流误差大于电压误差时自动进入 CC 模式，反之进入 CV 模式，切换过程无过冲。

## 5. 测试结果

| 测试项目 | 结果 |
|----------|------|
| 输出电压纹波 (12V/5A) | 38 mVpp |
| 负载调整率 (0→10A) | 0.3% |
| 电源调整率 (24V→48V) | 0.1% |
| 负载瞬态响应 (5A→10A, 1A/μs) | 过冲 180mV, 恢复时间 120μs |
| 峰值效率 (24V→12V/6A) | 94.2% |
| 满载效率 (24V→12V/10A) | 92.8% |

## 6. 问题与改进

### 问题 1: 轻载振荡

**现象**：输出电流 < 500mA 时，输出电压出现约 2kHz 的低频振荡。
**原因**：轻载进入 DCM 模式后，小信号模型发生变化，原 PI 参数不再适用。
**解决**：加入**增益调度** — 根据负载电流自动调整 PI 参数。轻载时降低 Ki 为满载值的 1/4。

### 问题 2: 启动过冲

**现象**：上电瞬间输出电压过冲约 2V。
**原因**：积分器在上电前已饱和。
**解决**：使能输出前将积分器清零，并使能软启动斜坡。

## 7. 总结

本项目实现了一款基于 STM32F334 的全数字控制同步 Buck 变换器，达到了预期指标。数字双环控制 + HRTIM 高分辨率 PWM 的组合在动态响应和稳态精度上都优于传统模拟方案。后续计划加入 CAN 总线通信，实现多机并联均流。
