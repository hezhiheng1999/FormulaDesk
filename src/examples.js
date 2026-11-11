"use strict";

// Curated common-first order, not measured usage statistics. Each group has
// twelve examples; browsing the catalog never changes the user's current work.
(function (root) {
  const groups = [
    { id: "coherent", label: "相干通信", items: [
      { title: "复基带信号", latex: String.raw`s_k=I_k+\mathrm{j}Q_k`, note: "I_k、Q_k 为同相与正交分量，均为实数；j² = −1。" },
      { title: "载波频偏与相位噪声", latex: String.raw`r_k=s_k e^{\mathrm{j}(2\pi\Delta f kT_s+\phi_k)}+n_k`, note: "简化单偏振接收模型：Δf 为频偏，T_s 为符号间隔，φ_k 为相位噪声，n_k 为加性噪声；暂不含信道记忆。" },
      { title: "信噪比", latex: String.raw`\mathrm{SNR}=\frac{\mathbb{E}[|s_k|^2]}{\mathbb{E}[|n_k|^2]}`, note: "SNR 是同一采样位置、同一带宽内的平均信号功率与噪声功率之比，此处为线性值。" },
      { title: "均方误差", latex: String.raw`\mathrm{MSE}=\frac{1}{N}\sum_{k=1}^{N}|y_k-d_k|^2`, note: "y_k 为均衡输出，d_k 为对齐的参考符号；使用复数误差的模平方。" },
      { title: "均方根 EVM", latex: String.raw`\mathrm{EVM}_{\mathrm{rms}}=\sqrt{\frac{\sum_{k=1}^{N}|y_k-d_k|^2}{\sum_{k=1}^{N}|d_k|^2}}`, note: "y_k 与参考符号 d_k 已做时间、幅度与载波对齐；此式为归一化比值，乘 100% 可写为百分比。" },
      { title: "FIR 均衡", latex: String.raw`y_k=\sum_{\ell=0}^{L-1}h_\ell r_{k-\ell}`, note: "r_k 为输入，h_ℓ 为 L 个复数 FIR 系数；本式按卷积形式定义系数。" },
      { title: "双偏振蝶形均衡", latex: String.raw`\begin{bmatrix}y_{x,k}\\y_{y,k}\end{bmatrix}=\sum_{\ell=0}^{L-1}\begin{bmatrix}h_{xx,\ell}&h_{xy,\ell}\\h_{yx,\ell}&h_{yy,\ell}\end{bmatrix}\begin{bmatrix}r_{x,k-\ell}\\r_{y,k-\ell}\end{bmatrix}`, note: "x、y 表示两个偏振支路；四组 FIR 系数同时处理支路内失真与偏振串扰。" },
      { title: "QPSK 星座", latex: String.raw`s_m=\sqrt{E_s}\,e^{\mathrm{j}(\pi/4+m\pi/2)},\quad m\in\{0,1,2,3\}`, note: "E_s 为符号能量，四个星座点相差 π/2；该表达式尚未指定比特到符号的映射。" },
      { title: "复数 LMS 更新", latex: String.raw`y_k=\mathbf{w}_k^{H}\mathbf{x}_k,\quad e_k=d_k-y_k,\quad\mathbf{w}_{k+1}=\mathbf{w}_k+\mu\mathbf{x}_k e_k^{*}`, note: "x_k 为输入向量，w_k 为权重，H 为共轭转置，* 为复共轭，μ 为实数步长；d_k 可来自训练或判决。" },
      { title: "恒模代价", latex: String.raw`J_{\mathrm{CMA}}=\mathbb{E}\!\left[(|y_k|^2-R)^2\right]`, note: "y_k 为均衡输出；常用目标 R = E[|s|⁴] / E[|s|²]。恒模代价不直接解决载波相位歧义。" },
      { title: "激光相位随机游走", latex: String.raw`\phi_k=\phi_{k-1}+\nu_k,\quad\nu_k\sim\mathcal{N}(0,2\pi\Delta\nu T_s)`, note: "采用独立高斯相位增量模型；Δν 是发射激光与本振的合计线宽，T_s 为相邻符号间隔。" },
      { title: "误比特率", latex: String.raw`\mathrm{BER}=\frac{N_{\mathrm{error}}}{N_{\mathrm{bits}}}`, note: "N_error 为对齐后比较得到的错误比特数，N_bits 为比较总比特数；有限样本的 BER 估计需要结合样本量解释。" },
    ] },
    { id: "general", label: "通用数学", items: [
      { title: "一元二次方程求根", latex: String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`, note: "对应 ax² + bx + c = 0，a ≠ 0；实数解要求判别式 b² − 4ac ≥ 0。" },
      { title: "欧拉公式", latex: String.raw`e^{\mathrm{j}\theta}=\cos\theta+\mathrm{j}\sin\theta`, note: "θ 为实数角度，使用弧度；j² = −1。" },
      { title: "平方和三角恒等式", latex: String.raw`\sin^2\theta+\cos^2\theta=1`, note: "θ 为实数，sin²θ 表示 (sin θ)²。" },
      { title: "幂函数求导", latex: String.raw`\frac{\mathrm{d}}{\mathrm{d}x}x^n=nx^{n-1}`, note: "此处取正整数 n；扩展到一般实数指数时需同时考虑 x 的定义域。" },
      { title: "乘积求导", latex: String.raw`(fg)'(x)=f'(x)g(x)+f(x)g'(x)`, note: "f 与 g 在 x 处可导，撇号表示对 x 求导。" },
      { title: "链式求导", latex: String.raw`\frac{\mathrm{d}}{\mathrm{d}x}f(g(x))=f'(g(x))g'(x)`, note: "g 在 x 处可导，f 在 g(x) 处可导。" },
      { title: "微积分基本定理", latex: String.raw`\int_a^b f(x)\,\mathrm{d}x=F(b)-F(a)`, note: "f 在闭区间 [a,b] 连续，F 为其原函数，即 F′ = f。" },
      { title: "分部积分", latex: String.raw`\int_a^b u(x)v'(x)\,\mathrm{d}x=[u(x)v(x)]_a^b-\int_a^b u'(x)v(x)\,\mathrm{d}x`, note: "u、v 在区间内连续可微；方括号表示端点值之差。" },
      { title: "有限等比数列求和", latex: String.raw`\sum_{k=0}^{n-1}ar^k=a\frac{1-r^n}{1-r}`, note: "n 为正整数，公比 r ≠ 1；当 r = 1 时，和为 na。" },
      { title: "二项式定理", latex: String.raw`(a+b)^n=\sum_{k=0}^{n}\binom{n}{k}a^{n-k}b^k`, note: "n 为非负整数，二项式系数 C(n,k) = n! / (k!(n−k)!)。" },
      { title: "泰勒展开", latex: String.raw`f(x)=\sum_{k=0}^{n}\frac{f^{(k)}(a)}{k!}(x-a)^k+R_n(x)`, note: "f 具备所需阶数的导数；R_n(x) 是余项，有限阶展开应保留或估计余项。" },
      { title: "换底公式", latex: String.raw`\log_a x=\frac{\ln x}{\ln a}`, note: "实数范围内要求 x > 0，a > 0 且 a ≠ 1；ln 为自然对数。" },
    ] },
    { id: "linear", label: "线性代数", items: [
      { title: "线性方程组", latex: String.raw`\mathbf{A}\mathbf{x}=\mathbf{b}`, note: "A 为 m×n 矩阵，x 为 n 维未知向量，b 为 m 维向量；解的存在性与唯一性取决于秩。" },
      { title: "矩阵乘法", latex: String.raw`C_{ij}=\sum_{k=1}^{n}A_{ik}B_{kj}`, note: "A 为 m×n，B 为 n×p，则 C = AB 为 m×p；矩阵乘法一般不可交换。" },
      { title: "复向量内积", latex: String.raw`\langle\mathbf{x},\mathbf{y}\rangle=\mathbf{x}^{H}\mathbf{y}=\sum_{k=1}^{n}x_k^{*}y_k`, note: "采用第一个参数共轭线性的约定，H 为共轭转置，* 为复共轭。" },
      { title: "欧几里得范数", latex: String.raw`\|\mathbf{x}\|_2=\sqrt{\sum_{k=1}^{n}|x_k|^2}`, note: "x 可以是实向量或复向量；复数分量使用模平方。" },
      { title: "特征值与特征向量", latex: String.raw`\mathbf{A}\mathbf{v}=\lambda\mathbf{v},\quad\mathbf{v}\ne\mathbf{0}`, note: "A 为方阵，λ 为特征值，v 为对应的非零特征向量。" },
      { title: "最小二乘解", latex: String.raw`\hat{\mathbf{x}}=(\mathbf{A}^{T}\mathbf{A})^{-1}\mathbf{A}^{T}\mathbf{b}`, note: "此式针对实数矩阵 A 且列满秩，求解 min ||Ax−b||₂²；数值计算通常使用 QR 或 SVD。" },
      { title: "二阶行列式", latex: String.raw`\det\begin{bmatrix}a&b\\c&d\end{bmatrix}=ad-bc`, note: "行列式非零时，该二阶方阵可逆。" },
      { title: "二阶矩阵求逆", latex: String.raw`\begin{bmatrix}a&b\\c&d\end{bmatrix}^{-1}=\frac{1}{ad-bc}\begin{bmatrix}d&-b\\-c&a\end{bmatrix}`, note: "要求 ad − bc ≠ 0；接近奇异时，求逆对输入扰动可能很敏感。" },
      { title: "奇异值分解", latex: String.raw`\mathbf{A}=\mathbf{U}\mathbf{\Sigma}\mathbf{V}^{H}`, note: "A 为复数 m×n 矩阵，U、V 为酉矩阵，Σ 为非负奇异值构成的矩形对角矩阵。" },
      { title: "矩阵乘积转置", latex: String.raw`(\mathbf{A}\mathbf{B})^{T}=\mathbf{B}^{T}\mathbf{A}^{T}`, note: "A、B 的维度允许相乘；转置后乘积顺序反转。复数情形的共轭转置也满足相应规则。" },
      { title: "矩阵的迹", latex: String.raw`\operatorname{tr}(\mathbf{A})=\sum_{i=1}^{n}A_{ii}`, note: "A 为 n×n 方阵，迹等于主对角线元素之和。" },
      { title: "秩与零空间维数", latex: String.raw`\operatorname{rank}(\mathbf{A})+\dim\ker(\mathbf{A})=n`, note: "A 有 n 列；零空间是所有满足 Ax = 0 的输入向量组成的空间。" },
    ] },
    { id: "probability", label: "概率论与数理统计", items: [
      { title: "样本均值", latex: String.raw`\bar{x}=\frac{1}{n}\sum_{i=1}^{n}x_i`, note: "x_i 为 n 个实数观测值，n ≥ 1；样本均值用于估计总体均值。" },
      { title: "无偏样本方差", latex: String.raw`s^2=\frac{1}{n-1}\sum_{i=1}^{n}(x_i-\bar{x})^2`, note: "n ≥ 2；在独立同分布且总体方差有限时，该式是总体方差的无偏估计。" },
      { title: "离散随机变量期望", latex: String.raw`\mathbb{E}[X]=\sum_x x\,P(X=x)`, note: "对 X 的所有可能取值求和；期望存在需要相应的可积条件。" },
      { title: "总体方差", latex: String.raw`\operatorname{Var}(X)=\mathbb{E}[(X-\mathbb{E}[X])^2]=\mathbb{E}[X^2]-(\mathbb{E}[X])^2`, note: "X 为实随机变量且二阶矩有限；方差描述围绕均值的离散程度。" },
      { title: "正态分布密度", latex: String.raw`f_X(x)=\frac{1}{\sqrt{2\pi}\sigma}\exp\!\left[-\frac{(x-\mu)^2}{2\sigma^2}\right]`, note: "X ~ N(μ,σ²)，σ > 0；此式为概率密度，单点处的密度值不是单点概率。" },
      { title: "条件概率", latex: String.raw`P(A\mid B)=\frac{P(A\cap B)}{P(B)}`, note: "要求 P(B) > 0；A、B 为同一概率空间中的事件。" },
      { title: "贝叶斯公式", latex: String.raw`P(A\mid B)=\frac{P(B\mid A)P(A)}{P(B)}`, note: "要求相关条件概率有定义且 P(B) > 0；P(A) 为先验，P(A|B) 为观察 B 后的后验。" },
      { title: "全概率公式", latex: String.raw`P(B)=\sum_{i=1}^{n}P(B\mid A_i)P(A_i)`, note: "A_i 两两互斥并构成完备事件组，且 P(A_i) > 0。" },
      { title: "协方差", latex: String.raw`\operatorname{Cov}(X,Y)=\mathbb{E}[(X-\mathbb{E}[X])(Y-\mathbb{E}[Y])]`, note: "X、Y 为二阶矩有限的实随机变量；零协方差一般不等价于独立。" },
      { title: "相关系数", latex: String.raw`\rho_{XY}=\frac{\operatorname{Cov}(X,Y)}{\sqrt{\operatorname{Var}(X)\operatorname{Var}(Y)}}`, note: "X、Y 为方差有限且严格为正的实随机变量，ρ 的取值在 [−1,1] 内。" },
      { title: "二项分布", latex: String.raw`P(X=k)=\binom{n}{k}p^k(1-p)^{n-k}`, note: "n 次独立、成功概率均为 p 的伯努利试验；k = 0,…,n，0 ≤ p ≤ 1。" },
      { title: "中心极限定理", latex: String.raw`\frac{\sqrt{n}(\bar{X}_n-\mu)}{\sigma}\overset{d}{\longrightarrow}\mathcal{N}(0,1)`, note: "X_i 独立同分布，总体均值 μ、方差 σ² 有限且 σ > 0；箭头表示 n 趋于无穷时依分布收敛。" },
    ] },
  ];
  if (typeof module === "object" && module.exports) module.exports = groups;
  else root.FormulaDeskExamples = groups;
})(typeof globalThis !== "undefined" ? globalThis : this);
