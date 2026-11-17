"use strict";

((root) => {
  const groups = [
  {
    "id": "coherent",
    "label": "相干光通信",
    "items": [
      {
        "id": "coherent-01",
        "title": "复基带信号",
        "latex": "s_k=I_k+\\mathrm{j}Q_k",
        "note": "I_k、Q_k 为同相与正交分量，均为实数；j²=−1，s_k 为复数符号或已注明采样时刻的复包络值。"
      },
      {
        "id": "coherent-02",
        "title": "载波频偏与相位噪声",
        "latex": "r_k=s_ke^{\\mathrm{j}(2\\pi\\Delta f kT_s+\\phi_k)}+n_k",
        "note": "简化单偏振、每符号一个样本的接收模型：Δf 为 Hz，T_s 为符号间隔，φ_k 为 rad；暂不含信道记忆。"
      },
      {
        "id": "coherent-03",
        "title": "线性信噪比与分贝",
        "latex": "\\mathrm{SNR}=\\frac{\\mathbb{E}[|s_k|^2]}{\\mathbb{E}[|n_k|^2]},\\quad \\mathrm{SNR}_{\\mathrm{dB}}=10\\log_{10}\\mathrm{SNR}",
        "note": "分子、分母是同一采样位置、同一带宽中的平均信号与噪声功率；此式的线性 SNR 不能直接与 dB 数值相加。"
      },
      {
        "id": "coherent-04",
        "title": "均方误差",
        "latex": "\\mathrm{MSE}=\\frac{1}{N}\\sum_{k=1}^{N}|y_k-d_k|^2",
        "note": "y_k 为均衡输出，d_k 为时间与载波已对齐的参考符号；使用复数误差的模平方。"
      },
      {
        "id": "coherent-05",
        "title": "均方根 EVM",
        "latex": "\\mathrm{EVM}_{\\mathrm{rms}}=\\sqrt{\\frac{\\sum_{k=1}^{N}|y_k-d_k|^2}{\\sum_{k=1}^{N}|d_k|^2}}",
        "note": "输出与参考符号已完成时间、幅度和载波对齐，参考能量非零；此为比值，乘 100% 为百分比。EVM 不普遍等于 SNR 的平方根倒数。"
      },
      {
        "id": "coherent-06",
        "title": "复数 FIR 均衡",
        "latex": "y_k=\\sum_{\\ell=0}^{L-1}h_\\ell r_{k-\\ell}",
        "note": "r_k 为输入，h_ℓ 为 L 个复 FIR 系数；按卷积形式定义系数，和 y=wᴴx 的权重定义相差一次共轭。"
      },
      {
        "id": "coherent-07",
        "title": "双偏振蝶形均衡",
        "latex": "\\begin{bmatrix}y_{x,k}\\\\y_{y,k}\\end{bmatrix}=\\sum_{\\ell=0}^{L-1}\\begin{bmatrix}h_{xx,\\ell}&h_{xy,\\ell}\\\\h_{yx,\\ell}&h_{yy,\\ell}\\end{bmatrix}\\begin{bmatrix}r_{x,k-\\ell}\\\\r_{y,k-\\ell}\\end{bmatrix}",
        "note": "x、y 为两个偏振支路；四组复 FIR 同时处理支路内记忆与支路间串扰，不能仅靠两路独立标量均衡器替代。"
      },
      {
        "id": "coherent-08",
        "title": "复数 LMS 更新",
        "latex": "y_k=\\mathbf{w}_k^{H}\\mathbf{x}_k,\\quad e_k=d_k-y_k,\\quad\\mathbf{w}_{k+1}=\\mathbf{w}_k+\\mu\\mathbf{x}_ke_k^{*}",
        "note": "H 为共轭转置，* 为复共轭，μ>0 为实步长；d_k 来自训练或判决，收敛要求步长与输入相关性适配。"
      },
      {
        "id": "coherent-09",
        "title": "恒模代价",
        "latex": "J_{\\mathrm{CMA}}=\\mathbb{E}\\!\\left[(|y_k|^2-R)^2\\right],\\quad R=\\frac{\\mathbb{E}[|s|^4]}{\\mathbb{E}[|s|^2]}",
        "note": "s 为目标符号且平均能量非零，y_k 为均衡输出；CMA 可盲均衡，但此代价不直接解决载波相位歧义。"
      },
      {
        "id": "coherent-10",
        "title": "激光相位随机游走",
        "latex": "\\phi_k=\\phi_{k-1}+\\nu_k,\\quad \\nu_k\\sim\\mathcal{N}(0,2\\pi\\Delta\\nu T_s)",
        "note": "独立高斯相位增量的 Wiener 模型；Δν 为独立发射激光与本振的 Lorentzian 线宽之和（Hz），T_s 为采样间隔（s）。"
      },
      {
        "id": "coherent-11",
        "title": "光纤功率衰减与损耗单位",
        "latex": "P(L)=P(0)e^{-\\alpha L}=P(0)10^{-\\alpha_{\\mathrm{dB}}L/10},\\quad \\alpha=\\frac{\\ln10}{10}\\alpha_{\\mathrm{dB}}",
        "note": "α 是功率衰减系数，α_dB 为单位长度 dB 损耗，L 使用对应长度单位；光场幅度衰减因子为 e^(−αL/2)。"
      },
      {
        "id": "coherent-12",
        "title": "非线性有效长度",
        "latex": "L_{\\mathrm{eff}}=\\frac{1-e^{-\\alpha L}}{\\alpha}",
        "note": "光纤功率按 e^(−αz) 衰减，α>0、L≥0；α→0 的极限为 L，不能把 dB/km 数值直接当作 α。"
      },
      {
        "id": "coherent-13",
        "title": "色散参数与二阶传播常数",
        "latex": "D=-\\frac{2\\pi c}{\\lambda^2}\\beta_2,\\quad \\beta_2=\\frac{\\mathrm{d}^2\\beta}{\\mathrm{d}\\omega^2}",
        "note": "c 为真空光速，λ 为真空波长；若全用 SI，D 单位 s/m²、β₂ 单位 s²/m。1 ps/(nm·km)=10⁻⁶ s/m²。"
      },
      {
        "id": "coherent-14",
        "title": "色散传递函数及理想逆滤波",
        "latex": "H_{\\mathrm{CD}}(\\Omega)=e^{\\mathrm{j}\\beta_2L\\Omega^2/2},\\quad H_{\\mathrm{eq}}(\\Omega)=H_{\\mathrm{CD}}^{*}(\\Omega)",
        "note": "采用 ∂_zA=−jβ₂∂²_tA/2 和正变换 ∫A(t)e^(−jΩt)dt；忽略损耗、非线性及高阶色散，Ω 为相对载波的 rad/s。"
      },
      {
        "id": "coherent-15",
        "title": "窄带群时延展宽",
        "latex": "\\Delta\\tau\\approx |D|L\\Delta\\lambda",
        "note": "D 在光谱宽度 Δλ 内近似常数，Δλ≥0；Δτ 表示带宽两端的群时延差量级，D、L、Δλ 必须采用相容单位。"
      },
      {
        "id": "coherent-16",
        "title": "Kerr 非线性系数",
        "latex": "\\gamma=\\frac{2\\pi n_2}{\\lambda A_{\\mathrm{eff}}}",
        "note": "n₂ 为非线性折射率（m²/W），λ 为真空波长（m），A_eff 为有效模场面积（m²）；γ 单位 W⁻¹m⁻¹。"
      },
      {
        "id": "coherent-17",
        "title": "标量非线性薛定谔方程",
        "latex": "\\frac{\\partial A}{\\partial z}=-\\frac{\\alpha}{2}A-\\frac{\\mathrm{j}\\beta_2}{2}\\frac{\\partial^2 A}{\\partial t^2}+\\mathrm{j}\\gamma|A|^2A",
        "note": "t 为随群速度移动的迟滞时间，|A|² 为光功率；单偏振、慢变包络，忽略高阶色散、Raman、自陡峭及放大噪声。"
      },
      {
        "id": "coherent-18",
        "title": "自相位调制的非线性相移",
        "latex": "\\phi_{\\mathrm{NL}}=\\gamma P_0L_{\\mathrm{eff}}",
        "note": "连续波或可忽略色散的局部功率模型，P₀ 为入纤功率；含功率损耗的有效长度已计入，φ_NL 单位 rad。"
      },
      {
        "id": "coherent-19",
        "title": "双偏振 Manakov 方程",
        "latex": "\\frac{\\partial\\mathbf{A}}{\\partial z}=-\\frac{\\alpha}{2}\\mathbf{A}-\\frac{\\mathrm{j}\\beta_2}{2}\\frac{\\partial^2\\mathbf{A}}{\\partial t^2}+\\mathrm{j}\\frac{8}{9}\\gamma(\\mathbf{A}^{H}\\mathbf{A})\\mathbf{A}",
        "note": "A=[A_x,A_y]ᵀ，AᴴA 是双偏振总功率；快速随机双折射平均模型，忽略显式 PMD、高阶色散及 Raman，8/9 不用于一般固定双折射介质。"
      },
      {
        "id": "coherent-20",
        "title": "偏振基变换的 Jones 旋转",
        "latex": "\\begin{bmatrix}E_x'\\\\E_y'\\end{bmatrix}=\\begin{bmatrix}\\cos\\theta&\\sin\\theta\\\\-\\sin\\theta&\\cos\\theta\\end{bmatrix}\\begin{bmatrix}E_x\\\\E_y\\end{bmatrix}",
        "note": "坐标轴逆时针旋转 θ 的被动基变换，场分量相应反向旋转；该实正交矩阵只是 Jones 变换的一类。"
      },
      {
        "id": "coherent-21",
        "title": "一阶 PMD 的 Jones 模型",
        "latex": "\\mathbf{J}(\\Omega)=\\mathbf{U}\\begin{bmatrix}e^{-\\mathrm{j}\\Omega\\Delta\\tau/2}&0\\\\0&e^{\\mathrm{j}\\Omega\\Delta\\tau/2}\\end{bmatrix}\\mathbf{V}^{H}",
        "note": "U、V 为频率近似不变的酉矩阵，Δτ≥0 为两主偏振态差分群时延；已去除公共延迟，采用负指数傅里叶变换，忽略偏振相关损耗。"
      },
      {
        "id": "coherent-22",
        "title": "色散长度",
        "latex": "L_D=\\frac{T_0^2}{|\\beta_2|}",
        "note": "β₂≠0；T₀ 为所用脉冲模型的特征宽度，例如幅度 exp[−t²/(2T₀²)] 中的 T₀，不能无说明替换成强度 FWHM。"
      },
      {
        "id": "coherent-23",
        "title": "Jones 场的 Stokes 参数",
        "latex": "S_0=|E_x|^2+|E_y|^2,\\quad S_1=|E_x|^2-|E_y|^2,\\quad S_2=2\\operatorname{Re}(E_xE_y^*),\\quad S_3=2\\operatorname{Im}(E_xE_y^*)",
        "note": "此处明确以 +2 Im(E_xE_y*) 定义 S₃；其他手性或时间因子约定可能反号。部分偏振光应对这些二次量取适当统计平均。"
      },
      {
        "id": "coherent-24",
        "title": "光电探测器响应度",
        "latex": "\\mathcal{R}=\\frac{\\eta q}{h\\nu},\\quad I_{\\mathrm{ph}}=\\mathcal{R}P",
        "note": "η 为量子效率，q 为元电荷，h 为普朗克常数，ν 为光频率；理想线性探测，响应度 R 单位 A/W，不含暗电流与倍增。"
      },
      {
        "id": "coherent-25",
        "title": "理想平衡相干拍频",
        "latex": "i_{\\mathrm{diff}}=2\\mathcal{R}\\operatorname{Re}(E_sE_{\\mathrm{LO}}^{*})",
        "note": "采用 E_±=(E_s±E_LO)/√2 的无损 50:50 合束约定，两个同响应度探测器做电流相减；场模平方单位为 W。90°混频器还需计入分光比例。"
      },
      {
        "id": "coherent-26",
        "title": "EDFA 双偏振 ASE 功率",
        "latex": "P_{\\mathrm{ASE}}=2n_{\\mathrm{sp}}h\\nu(G-1)B_{\\mathrm{ref}}",
        "note": "G>1 为线性功率增益，n_sp 为自发辐射因子，B_ref 为 Hz；公式统计两个偏振在参考光带宽内的 ASE，单偏振时去掉系数 2。"
      },
      {
        "id": "coherent-27",
        "title": "OSNR 与符号 SNR",
        "latex": "\\mathrm{OSNR}=\\frac{P_s}{P_{\\mathrm{ASE}}(B_{\\mathrm{ref}})},\\quad \\mathrm{SNR}=\\mathrm{OSNR}\\frac{B_{\\mathrm{ref}}}{R_s}",
        "note": "第二式限双偏振均衡功率、白 ASE、理想 Nyquist 匹配接收，SNR 按每偏振符号定义；OSNR 分子与噪声均计两偏振，所有比值为线性值，R_s 单位 baud。"
      },
      {
        "id": "coherent-28",
        "title": "盲相位搜索代价",
        "latex": "\\hat{\\theta}_k=\\operatorname*{arg\\,min}_{\\theta\\in\\Theta}\\sum_{m=-K}^{K}\\min_{a\\in\\mathcal{S}}|r_{k+m}e^{-\\mathrm{j}\\theta}-a|^2",
        "note": "Θ 为候选相位网格，S 为已归一化星座；窗口内相位近似恒定，结果仍需处理星座旋转歧义和相位展开。"
      },
      {
        "id": "coherent-29",
        "title": "QPSK 四次方法相位估计",
        "latex": "\\hat{\\phi}_k=\\frac{1}{4}\\arg\\!\\left(-\\sum_{m=-K}^{K}r_{k+m}^{4}\\right)",
        "note": "适用于 π/4+mπ/2 星座且已补主要频偏、ISI；窗口内相位近似恒定，前置负号来自 s⁴=−E_s²，估计仅确定到 π/2 模糊。"
      },
      {
        "id": "coherent-30",
        "title": "QPSK 四次方法频偏估计",
        "latex": "\\widehat{\\Delta f}=\\frac{1}{8\\pi T_s}\\arg\\!\\left(\\sum_{k=1}^{N-1}r_k^4(r_{k-1}^{*})^4\\right)",
        "note": "每符号一个样本、无显著 ISI，频偏在块内恒定；理想无噪声无相位扰动时无模糊范围为 |Δf|<1/(8T_s)，噪声和相位变化会影响估计。"
      }
    ]
  },
  {
    "id": "algebra",
    "label": "基础代数与三角",
    "items": [
      {
        "id": "algebra-01",
        "title": "一元二次方程求根",
        "latex": "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}",
        "note": "对应 ax² + bx + c = 0，a ≠ 0；a、b、c 为实数时，实根要求 b² − 4ac ≥ 0。"
      },
      {
        "id": "algebra-02",
        "title": "韦达定理",
        "latex": "x_1+x_2=-\\frac{b}{a},\\quad x_1x_2=\\frac{c}{a}",
        "note": "x₁、x₂ 是 ax² + bx + c = 0 的两个根，按重数计，a ≠ 0；在复数范围也成立。"
      },
      {
        "id": "algebra-03",
        "title": "平方差分解",
        "latex": "a^2-b^2=(a-b)(a+b)",
        "note": "a、b 为实数或复数；可用于因式分解及分母有理化。"
      },
      {
        "id": "algebra-04",
        "title": "立方和与立方差",
        "latex": "a^3\\pm b^3=(a\\pm b)(a^2\\mp ab+b^2)",
        "note": "两处 ± 取同一符号，∓ 取相反符号；a、b 可为实数或复数。"
      },
      {
        "id": "algebra-05",
        "title": "二项式定理",
        "latex": "(a+b)^n=\\sum_{k=0}^{n}\\binom{n}{k}a^{n-k}b^k",
        "note": "n 为非负整数，二项式系数 C(n,k) = n!/[k!(n−k)!]。"
      },
      {
        "id": "algebra-06",
        "title": "等差数列求和",
        "latex": "\\sum_{k=1}^{n}[a_1+(k-1)d]=\\frac{n}{2}[2a_1+(n-1)d]",
        "note": "n 为正整数，a₁ 为首项，d 为公差。"
      },
      {
        "id": "algebra-07",
        "title": "有限等比数列求和",
        "latex": "\\sum_{k=0}^{n-1}ar^k=a\\frac{1-r^n}{1-r}",
        "note": "n 为正整数，r ≠ 1；r = 1 时和为 na。"
      },
      {
        "id": "algebra-08",
        "title": "无限等比级数",
        "latex": "\\sum_{k=0}^{\\infty}ar^k=\\frac{a}{1-r}",
        "note": "要求 |r| < 1；a、r 可以为实数或复数。"
      },
      {
        "id": "algebra-09",
        "title": "同底数幂的运算",
        "latex": "a^x a^y=a^{x+y},\\quad (a^x)^y=a^{xy}",
        "note": "此处取 a > 0，x、y 为实数，避免负底数或复数幂的分支歧义。"
      },
      {
        "id": "algebra-10",
        "title": "对数乘积法则",
        "latex": "\\log_a(xy)=\\log_a x+\\log_a y",
        "note": "实数范围要求 x > 0、y > 0、a > 0 且 a ≠ 1。"
      },
      {
        "id": "algebra-11",
        "title": "对数换底",
        "latex": "\\log_a x=\\frac{\\ln x}{\\ln a}",
        "note": "x > 0，a > 0 且 a ≠ 1；ln 是自然对数。"
      },
      {
        "id": "algebra-12",
        "title": "绝对值三角不等式",
        "latex": "|a+b|\\le |a|+|b|",
        "note": "a、b 可为实数或复数；|·| 表示绝对值或复数模。"
      },
      {
        "id": "algebra-13",
        "title": "算术—几何平均不等式",
        "latex": "\\frac{a_1+\\cdots+a_n}{n}\\ge\\sqrt[n]{a_1\\cdots a_n}",
        "note": "n 为正整数，各 aᵢ ≥ 0；等号当且仅当所有 aᵢ 相等。"
      },
      {
        "id": "algebra-14",
        "title": "伯努利不等式",
        "latex": "(1+x)^n\\ge 1+nx",
        "note": "此处取 x ≥ −1，n 为正整数；该条件下两端均为实数。"
      },
      {
        "id": "algebra-15",
        "title": "欧拉复指数公式",
        "latex": "e^{\\mathrm{j}\\theta}=\\cos\\theta+\\mathrm{j}\\sin\\theta",
        "note": "θ 为实数角度，采用弧度；j² = −1。"
      },
      {
        "id": "algebra-16",
        "title": "复数模与共轭",
        "latex": "z=a+\\mathrm{j}b,\\quad |z|=\\sqrt{z\\overline{z}}=\\sqrt{a^2+b^2}",
        "note": "a、b 为实数，z̄ = a − jb，j² = −1；平方根取非负实根。"
      },
      {
        "id": "algebra-17",
        "title": "复数除法",
        "latex": "\\frac{a+\\mathrm{j}b}{c+\\mathrm{j}d}=\\frac{ac+bd}{c^2+d^2}+\\mathrm{j}\\frac{bc-ad}{c^2+d^2}",
        "note": "a、b、c、d 为实数，c² + d² > 0，j² = −1；分子分母同乘分母的共轭。"
      },
      {
        "id": "algebra-18",
        "title": "棣莫弗公式",
        "latex": "(\\cos\\theta+\\mathrm{j}\\sin\\theta)^n=\\cos(n\\theta)+\\mathrm{j}\\sin(n\\theta)",
        "note": "θ 为实数弧度，n 为整数，j² = −1；用于计算单位模复数的整数次幂。"
      },
      {
        "id": "algebra-19",
        "title": "非零复数的 n 次根",
        "latex": "z_k=r^{1/n}e^{\\mathrm{j}(\\theta+2k\\pi)/n},\\quad k=0,\\ldots,n-1",
        "note": "求解 zⁿ = r e^{jθ}，r > 0，n 为正整数，θ 为给定辐角；这里列出全部 n 个不同的根。"
      },
      {
        "id": "algebra-20",
        "title": "平方和三角恒等式",
        "latex": "\\sin^2\\theta+\\cos^2\\theta=1",
        "note": "θ 为实数角度；sin²θ 表示 (sin θ)²。"
      },
      {
        "id": "algebra-21",
        "title": "正弦和角公式",
        "latex": "\\sin(\\alpha+\\beta)=\\sin\\alpha\\cos\\beta+\\cos\\alpha\\sin\\beta",
        "note": "α、β 为实数角度；统一采用弧度。"
      },
      {
        "id": "algebra-22",
        "title": "余弦和角公式",
        "latex": "\\cos(\\alpha+\\beta)=\\cos\\alpha\\cos\\beta-\\sin\\alpha\\sin\\beta",
        "note": "α、β 为实数角度；负号位于两个正弦的乘积前。"
      },
      {
        "id": "algebra-23",
        "title": "正切和角公式",
        "latex": "\\tan(\\alpha+\\beta)=\\frac{\\tan\\alpha+\\tan\\beta}{1-\\tan\\alpha\\tan\\beta}",
        "note": "要求 tan α、tan β 有定义，且 1 − tan α tan β ≠ 0；角度采用弧度。"
      },
      {
        "id": "algebra-24",
        "title": "二倍角公式",
        "latex": "\\sin(2\\theta)=2\\sin\\theta\\cos\\theta,\\quad \\cos(2\\theta)=\\cos^2\\theta-\\sin^2\\theta",
        "note": "θ 为实数角度；给出正弦和余弦的二倍角关系。"
      },
      {
        "id": "algebra-25",
        "title": "半角平方公式",
        "latex": "\\sin^2\\frac{\\theta}{2}=\\frac{1-\\cos\\theta}{2},\\quad \\cos^2\\frac{\\theta}{2}=\\frac{1+\\cos\\theta}{2}",
        "note": "θ 为实数角度；这里写成平方形式，开方时还需依据角所在象限选符号。"
      },
      {
        "id": "algebra-26",
        "title": "正弦和差化积",
        "latex": "\\sin\\alpha+\\sin\\beta=2\\sin\\frac{\\alpha+\\beta}{2}\\cos\\frac{\\alpha-\\beta}{2}",
        "note": "α、β 为实数角度；将两个正弦之和改写为乘积。"
      },
      {
        "id": "algebra-27",
        "title": "余弦积化和差",
        "latex": "\\cos\\alpha\\cos\\beta=\\frac{\\cos(\\alpha+\\beta)+\\cos(\\alpha-\\beta)}{2}",
        "note": "α、β 为实数角度；在积分与谐波展开中常用。"
      },
      {
        "id": "algebra-28",
        "title": "正弦定理",
        "latex": "\\frac{a}{\\sin A}=\\frac{b}{\\sin B}=\\frac{c}{\\sin C}=2R",
        "note": "非退化平面三角形中，a、b、c 分别对角 A、B、C；R 为外接圆半径。"
      },
      {
        "id": "algebra-29",
        "title": "余弦定理",
        "latex": "c^2=a^2+b^2-2ab\\cos C",
        "note": "非退化平面三角形中，C 为边 a 与 b 的夹角，c 为 C 的对边。"
      },
      {
        "id": "algebra-30",
        "title": "帕斯卡恒等式",
        "latex": "\\binom{n}{k}=\\binom{n-1}{k-1}+\\binom{n-1}{k}",
        "note": "n ≥ 2，1 ≤ k ≤ n−1，均为整数；将 n 个元素中的 k 元子集按是否含某个指定元素分类。"
      }
    ]
  },
  {
    "id": "calculus",
    "label": "微积分",
    "items": [
      {
        "id": "calculus-01",
        "title": "导数的极限定义",
        "latex": "f'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}",
        "note": "要求右侧极限存在；x 为定义域内点，h ≠ 0 且 x+h 在定义域内。"
      },
      {
        "id": "calculus-02",
        "title": "幂函数求导",
        "latex": "\\frac{\\mathrm{d}}{\\mathrm{d}x}x^p=px^{p-1}",
        "note": "此处取 x > 0，p 为实数；整数幂可按其定义域扩展。"
      },
      {
        "id": "calculus-03",
        "title": "乘积求导",
        "latex": "(fg)'(x)=f'(x)g(x)+f(x)g'(x)",
        "note": "f、g 在 x 处可导；撇号表示对 x 求导。"
      },
      {
        "id": "calculus-04",
        "title": "商的求导",
        "latex": "\\left(\\frac{f}{g}\\right)'(x)=\\frac{f'(x)g(x)-f(x)g'(x)}{g(x)^2}",
        "note": "f、g 在 x 处可导，且 g(x) ≠ 0。"
      },
      {
        "id": "calculus-05",
        "title": "复合函数链式法则",
        "latex": "\\frac{\\mathrm{d}}{\\mathrm{d}x}f(g(x))=f'(g(x))g'(x)",
        "note": "g 在 x 处可导，f 在 g(x) 处可导。"
      },
      {
        "id": "calculus-06",
        "title": "指数函数求导",
        "latex": "\\frac{\\mathrm{d}}{\\mathrm{d}x}a^x=a^x\\ln a",
        "note": "a > 0 为常数，x 为实数；a = e 时导数仍为 eˣ。"
      },
      {
        "id": "calculus-07",
        "title": "对数函数求导",
        "latex": "\\frac{\\mathrm{d}}{\\mathrm{d}x}\\ln|x|=\\frac{1}{x}",
        "note": "x ≠ 0；在不跨越零点的区间上使用。"
      },
      {
        "id": "calculus-08",
        "title": "正弦与余弦求导",
        "latex": "\\frac{\\mathrm{d}}{\\mathrm{d}x}\\sin x=\\cos x,\\quad \\frac{\\mathrm{d}}{\\mathrm{d}x}\\cos x=-\\sin x",
        "note": "x 用弧度表示；若以角度制为自变量，需额外乘换算因子。"
      },
      {
        "id": "calculus-09",
        "title": "反函数求导",
        "latex": "(f^{-1})'(y)=\\frac{1}{f'(f^{-1}(y))}",
        "note": "f 在所考虑区间单调可逆且连续可微，分母不为零；f⁻¹ 表示反函数。"
      },
      {
        "id": "calculus-10",
        "title": "隐函数求导",
        "latex": "\\frac{\\mathrm{d}y}{\\mathrm{d}x}=-\\frac{F_x(x,y)}{F_y(x,y)}",
        "note": "F(x,y)=0，F 连续可微且 F_y ≠ 0；局部可将 y 表示为 x 的可微函数。"
      },
      {
        "id": "calculus-11",
        "title": "多元函数梯度",
        "latex": "\\nabla f=\\begin{bmatrix}\\frac{\\partial f}{\\partial x_1}\\\\ \\vdots\\\\ \\frac{\\partial f}{\\partial x_n}\\end{bmatrix}",
        "note": "f 为实值函数，各分量为对相应坐标的偏导数；此处把梯度写为列向量。"
      },
      {
        "id": "calculus-12",
        "title": "方向导数",
        "latex": "D_{\\mathbf{u}}f(\\mathbf{x})=\\nabla f(\\mathbf{x})^{T}\\mathbf{u},\\quad \\|\\mathbf{u}\\|_2=1",
        "note": "f 在 x 处全微分存在，u 为实单位方向向量；方向导数按单位长度变化定义。"
      },
      {
        "id": "calculus-13",
        "title": "全微分",
        "latex": "\\mathrm{d}f=\\sum_{i=1}^{n}\\frac{\\partial f}{\\partial x_i}\\,\\mathrm{d}x_i",
        "note": "f 在该点可微；全微分给出自变量小变化引起的一阶线性近似。"
      },
      {
        "id": "calculus-14",
        "title": "二元函数 Hessian",
        "latex": "\\mathbf{H}_f=\\begin{bmatrix}f_{xx}&f_{xy}\\\\f_{yx}&f_{yy}\\end{bmatrix}",
        "note": "f 在邻域二阶连续可微时 f_xy = f_yx；Hessian 用于描述局部二阶变化。"
      },
      {
        "id": "calculus-15",
        "title": "泰勒公式与拉格朗日余项",
        "latex": "f(x)=\\sum_{k=0}^{n}\\frac{f^{(k)}(a)}{k!}(x-a)^k+\\frac{f^{(n+1)}(\\xi)}{(n+1)!}(x-a)^{n+1}",
        "note": "n 为非负整数，f 在含 a 与 x 的区间上有连续的 n+1 阶导数；x ≠ a 时 ξ 位于 a 与 x 之间。"
      },
      {
        "id": "calculus-16",
        "title": "微积分基本定理",
        "latex": "\\int_a^b f(x)\\,\\mathrm{d}x=F(b)-F(a)",
        "note": "f 在 [a,b] 连续，F 为其原函数，即 F′ = f；a ≤ b。"
      },
      {
        "id": "calculus-17",
        "title": "幂函数不定积分",
        "latex": "\\int x^p\\,\\mathrm{d}x=\\frac{x^{p+1}}{p+1}+C",
        "note": "此处取 x > 0，p 为实数且 p ≠ −1；C 为积分常数。"
      },
      {
        "id": "calculus-18",
        "title": "倒数函数不定积分",
        "latex": "\\int\\frac{1}{x}\\,\\mathrm{d}x=\\ln|x|+C",
        "note": "在不包含零点的连通区间上成立，C 为该区间内的积分常数。"
      },
      {
        "id": "calculus-19",
        "title": "定积分换元",
        "latex": "\\int_a^b f(g(t))g'(t)\\,\\mathrm{d}t=\\int_{g(a)}^{g(b)}f(u)\\,\\mathrm{d}u",
        "note": "g 在 [a,b] 连续可微，f 在 g 的值域上连续；上下限随 u = g(t) 一起改变。"
      },
      {
        "id": "calculus-20",
        "title": "分部积分",
        "latex": "\\int_a^b u(x)v'(x)\\,\\mathrm{d}x=[u(x)v(x)]_a^b-\\int_a^b u'(x)v(x)\\,\\mathrm{d}x",
        "note": "u、v 在 [a,b] 连续可微；[uv]ₐᵇ = u(b)v(b) − u(a)v(a)。"
      },
      {
        "id": "calculus-21",
        "title": "无穷区间 p 积分",
        "latex": "\\int_1^\\infty\\frac{1}{x^p}\\,\\mathrm{d}x=\\frac{1}{p-1},\\quad p>1",
        "note": "p 为实数；当 p ≤ 1 时，该反常积分发散，不能使用右侧表达式。"
      },
      {
        "id": "calculus-22",
        "title": "平面曲线弧长",
        "latex": "L=\\int_a^b\\sqrt{1+[f'(x)]^2}\\,\\mathrm{d}x",
        "note": "曲线为 y = f(x)，f 在 [a,b] 连续可微，a ≤ b。"
      },
      {
        "id": "calculus-23",
        "title": "旋转体圆盘法",
        "latex": "V=\\pi\\int_a^b[f(x)]^2\\,\\mathrm{d}x",
        "note": "将 y = f(x) ≥ 0 与 x 轴之间的区域绕 x 轴旋转，f 连续；横截面为无内孔圆盘。"
      },
      {
        "id": "calculus-24",
        "title": "极坐标二重积分",
        "latex": "\\iint_D f(x,y)\\,\\mathrm{d}x\\,\\mathrm{d}y=\\iint_R f(r\\cos\\theta,r\\sin\\theta)\\,r\\,\\mathrm{d}r\\,\\mathrm{d}\\theta",
        "note": "x = r cos θ、y = r sin θ，r ≥ 0；R 覆盖 D 一次（边界可例外），f 可积；面积因子为 r。"
      },
      {
        "id": "calculus-25",
        "title": "二重积分的雅可比换元",
        "latex": "\\iint_D f(x,y)\\,\\mathrm{d}x\\,\\mathrm{d}y=\\iint_R f(x(u,v),y(u,v))\\left|\\frac{\\partial(x,y)}{\\partial(u,v)}\\right|\\,\\mathrm{d}u\\,\\mathrm{d}v",
        "note": "变换将 R 一一映到 D（边界可例外），连续可微且内部雅可比行列式非零；绝对值用于面积缩放，f 可积。"
      },
      {
        "id": "calculus-26",
        "title": "格林公式",
        "latex": "\\oint_{\\partial D}P\\,\\mathrm{d}x+Q\\,\\mathrm{d}y=\\iint_D\\left(\\frac{\\partial Q}{\\partial x}-\\frac{\\partial P}{\\partial y}\\right)\\,\\mathrm{d}A",
        "note": "D 为有分段光滑简单边界的平面区域，边界按逆时针正向；P、Q 在包含 D 及其边界的开集内连续可微。"
      },
      {
        "id": "calculus-27",
        "title": "散度定理",
        "latex": "\\iint_{\\partial V}\\mathbf{F}\\cdot\\mathbf{n}\\,\\mathrm{d}S=\\iiint_V\\nabla\\cdot\\mathbf{F}\\,\\mathrm{d}V",
        "note": "V 为有分段光滑闭合边界的有界空间区域，n 为外法向单位向量；F 在包含 V 及其边界的开集内连续可微。"
      },
      {
        "id": "calculus-28",
        "title": "斯托克斯公式",
        "latex": "\\oint_{\\partial S}\\mathbf{F}\\cdot\\mathrm{d}\\mathbf{r}=\\iint_S(\\nabla\\times\\mathbf{F})\\cdot\\mathbf{n}\\,\\mathrm{d}S",
        "note": "S 为分段光滑定向曲面，其简单闭合边界按与单位法向 n 一致的右手规则定向；F 在包含 S 的开集内连续可微。"
      },
      {
        "id": "calculus-29",
        "title": "可分离变量微分方程",
        "latex": "\\frac{\\mathrm{d}y}{\\mathrm{d}x}=g(x)h(y)\\quad\\Longrightarrow\\quad\\int\\frac{1}{h(y)}\\,\\mathrm{d}y=\\int g(x)\\,\\mathrm{d}x+C",
        "note": "g、h 连续，在 h(y) ≠ 0 的解区间上分离变量；h(y₀)=0 给出的常值解 y=y₀ 应另行检查。"
      },
      {
        "id": "calculus-30",
        "title": "一阶线性微分方程",
        "latex": "y'+p(x)y=q(x),\\quad y(x)=\\frac{\\int\\mu(x)q(x)\\,\\mathrm{d}x+C}{\\mu(x)},\\quad \\mu(x)=e^{\\int p(x)\\,\\mathrm{d}x}",
        "note": "p、q 在所考虑区间连续，μ 为选定的非零积分因子；各不定积分取任一原函数，C 表示任意常数。"
      }
    ]
  },
  {
    "id": "linear",
    "label": "线性代数",
    "items": [
      {
        "id": "linear-01",
        "title": "线性方程组",
        "latex": "\\mathbf{A}\\mathbf{x}=\\mathbf{b}",
        "note": "A 为 m×n 矩阵，x 为 n 维未知向量，b 为 m 维向量；解的存在性与唯一性取决于 A 和增广矩阵的秩。"
      },
      {
        "id": "linear-02",
        "title": "矩阵乘法",
        "latex": "C_{ij}=\\sum_{k=1}^{n}A_{ik}B_{kj}",
        "note": "A 为 m×n、B 为 n×p，则 C = AB 为 m×p；一般不能交换相乘顺序。"
      },
      {
        "id": "linear-03",
        "title": "矩阵乘积转置",
        "latex": "(\\mathbf{A}\\mathbf{B})^{T}=\\mathbf{B}^{T}\\mathbf{A}^{T}",
        "note": "A、B 的维度允许相乘；共轭转置 H 也满足同样的顺序反转规则。"
      },
      {
        "id": "linear-04",
        "title": "矩阵乘积求逆",
        "latex": "(\\mathbf{A}\\mathbf{B})^{-1}=\\mathbf{B}^{-1}\\mathbf{A}^{-1}",
        "note": "A、B 为同阶可逆方阵；逆矩阵的乘积顺序与原乘积相反。"
      },
      {
        "id": "linear-05",
        "title": "二阶行列式",
        "latex": "\\det\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}=ad-bc",
        "note": "a、b、c、d 为实数或复数；该行列式不为零时矩阵可逆。"
      },
      {
        "id": "linear-06",
        "title": "二阶矩阵求逆",
        "latex": "\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}^{-1}=\\frac{1}{ad-bc}\\begin{bmatrix}d&-b\\\\-c&a\\end{bmatrix}",
        "note": "要求 ad − bc ≠ 0；接近奇异时，逆矩阵可能对输入扰动敏感。"
      },
      {
        "id": "linear-07",
        "title": "乘积的行列式",
        "latex": "\\det(\\mathbf{A}\\mathbf{B})=\\det(\\mathbf{A})\\det(\\mathbf{B})",
        "note": "A、B 必须为同阶方阵；它们无需可逆。"
      },
      {
        "id": "linear-08",
        "title": "矩阵的迹",
        "latex": "\\operatorname{tr}(\\mathbf{A})=\\sum_{i=1}^{n}A_{ii}",
        "note": "A 为 n×n 方阵，迹等于主对角线元素之和。"
      },
      {
        "id": "linear-09",
        "title": "迹的循环性质",
        "latex": "\\operatorname{tr}(\\mathbf{A}\\mathbf{B})=\\operatorname{tr}(\\mathbf{B}\\mathbf{A})",
        "note": "A 为 m×n，B 为 n×m；AB 与 BA 可以不同阶，但两个迹相等。"
      },
      {
        "id": "linear-10",
        "title": "秩与零空间维数",
        "latex": "\\operatorname{rank}(\\mathbf{A})+\\dim\\ker(\\mathbf{A})=n",
        "note": "A 有 n 列；ker(A) 为满足 Ax = 0 的所有输入向量组成的空间。"
      },
      {
        "id": "linear-11",
        "title": "线性方程组的可解条件",
        "latex": "\\mathbf{A}\\mathbf{x}=\\mathbf{b}\\ \\text{有解}\\ \\Longleftrightarrow\\ \\operatorname{rank}(\\mathbf{A})=\\operatorname{rank}([\\mathbf{A}\\ \\mathbf{b}])",
        "note": "A 为 m×n，b 为 m 维；[A b] 为增广矩阵。可解且 rank(A)=n 时解唯一。"
      },
      {
        "id": "linear-12",
        "title": "复向量内积",
        "latex": "\\langle\\mathbf{x},\\mathbf{y}\\rangle=\\mathbf{x}^{H}\\mathbf{y}=\\sum_{k=1}^{n}x_k^{*}y_k",
        "note": "采用第一个参数共轭线性的约定；H 为共轭转置，* 为复共轭。"
      },
      {
        "id": "linear-13",
        "title": "欧几里得范数",
        "latex": "\\|\\mathbf{x}\\|_2=\\sqrt{\\sum_{k=1}^{n}|x_k|^2}",
        "note": "x 可以为实向量或复向量；复数分量使用模平方。"
      },
      {
        "id": "linear-14",
        "title": "柯西—施瓦茨不等式",
        "latex": "|\\mathbf{x}^{H}\\mathbf{y}|\\le\\|\\mathbf{x}\\|_2\\|\\mathbf{y}\\|_2",
        "note": "x、y 为同维复向量或实向量；等号当且仅当两向量线性相关。"
      },
      {
        "id": "linear-15",
        "title": "向非零向量作正交投影",
        "latex": "\\operatorname{proj}_{\\mathbf{u}}\\mathbf{x}=\\frac{\\mathbf{u}^{H}\\mathbf{x}}{\\mathbf{u}^{H}\\mathbf{u}}\\,\\mathbf{u}",
        "note": "u ≠ 0；x 与投影之差和 u 正交，内积采用共轭转置约定。"
      },
      {
        "id": "linear-16",
        "title": "Gram–Schmidt 正交化",
        "latex": "\\mathbf{v}_k=\\mathbf{a}_k-\\sum_{j=1}^{k-1}(\\mathbf{q}_j^{H}\\mathbf{a}_k)\\mathbf{q}_j,\\quad\\mathbf{q}_k=\\frac{\\mathbf{v}_k}{\\|\\mathbf{v}_k\\|_2}",
        "note": "a₁,…,aₙ 线性无关，先前 qⱼ 已单位正交；k=1 时求和为零。数值实现通常采用改进算法。"
      },
      {
        "id": "linear-17",
        "title": "正交矩阵保持长度",
        "latex": "\\mathbf{Q}^{T}\\mathbf{Q}=\\mathbf{I}\\quad\\Longrightarrow\\quad\\|\\mathbf{Q}\\mathbf{x}\\|_2=\\|\\mathbf{x}\\|_2",
        "note": "Q 为实方阵，x 为实向量；复数情形将 Q 取为酉矩阵并将 T 换成 H。"
      },
      {
        "id": "linear-18",
        "title": "特征值与特征向量",
        "latex": "\\mathbf{A}\\mathbf{v}=\\lambda\\mathbf{v},\\quad\\mathbf{v}\\ne\\mathbf{0}",
        "note": "A 为方阵，λ 为特征值，v 为对应的非零特征向量。"
      },
      {
        "id": "linear-19",
        "title": "特征多项式",
        "latex": "p_{\\mathbf{A}}(\\lambda)=\\det(\\lambda\\mathbf{I}-\\mathbf{A})",
        "note": "A 为 n×n 方阵，I 为同阶单位阵；p_A 的根为 A 的特征值，按代数重数计。"
      },
      {
        "id": "linear-20",
        "title": "可对角化矩阵",
        "latex": "\\mathbf{A}=\\mathbf{P}\\mathbf{\\Lambda}\\mathbf{P}^{-1}",
        "note": "A 有 n 个线性无关特征向量时，P 以这些向量为列，Λ 为对应特征值组成的对角阵。"
      },
      {
        "id": "linear-21",
        "title": "实对称矩阵谱分解",
        "latex": "\\mathbf{A}=\\mathbf{Q}\\mathbf{\\Lambda}\\mathbf{Q}^{T},\\quad\\mathbf{Q}^{T}\\mathbf{Q}=\\mathbf{I}",
        "note": "A 为实对称矩阵；Q 的列可选为单位正交特征向量，Λ 为实特征值组成的对角阵。"
      },
      {
        "id": "linear-22",
        "title": "奇异值分解",
        "latex": "\\mathbf{A}=\\mathbf{U}\\mathbf{\\Sigma}\\mathbf{V}^{H}",
        "note": "A 为复 m×n 矩阵，U 为 m×m、V 为 n×n 酉矩阵；Σ 为 m×n 非负矩形对角阵。"
      },
      {
        "id": "linear-23",
        "title": "Frobenius 范数",
        "latex": "\\|\\mathbf{A}\\|_F=\\sqrt{\\sum_{i,j}|A_{ij}|^2}=\\sqrt{\\operatorname{tr}(\\mathbf{A}^{H}\\mathbf{A})}",
        "note": "A 为任意实矩阵或复矩阵；该范数汇总所有元素的模平方。"
      },
      {
        "id": "linear-24",
        "title": "矩阵的谱范数",
        "latex": "\\|\\mathbf{A}\\|_2=\\max_{\\mathbf{x}\\ne\\mathbf{0}}\\frac{\\|\\mathbf{A}\\mathbf{x}\\|_2}{\\|\\mathbf{x}\\|_2}=\\sigma_{\\max}(\\mathbf{A})",
        "note": "A 至少有一列；σ_max 为最大奇异值，这里是由向量二范数诱导的矩阵范数。"
      },
      {
        "id": "linear-25",
        "title": "二范数条件数",
        "latex": "\\kappa_2(\\mathbf{A})=\\|\\mathbf{A}\\|_2\\|\\mathbf{A}^{-1}\\|_2=\\frac{\\sigma_{\\max}(\\mathbf{A})}{\\sigma_{\\min}(\\mathbf{A})}",
        "note": "A 为可逆方阵，σ_min > 0；条件数描述某些线性求解问题对相对扰动的敏感程度。"
      },
      {
        "id": "linear-26",
        "title": "简约 QR 分解",
        "latex": "\\mathbf{A}=\\mathbf{Q}\\mathbf{R},\\quad\\mathbf{Q}^{H}\\mathbf{Q}=\\mathbf{I}_n",
        "note": "A 为列满秩 m×n 矩阵，m ≥ n；Q 为 m×n，R 为 n×n 可逆上三角阵。"
      },
      {
        "id": "linear-27",
        "title": "列满秩最小二乘解",
        "latex": "\\hat{\\mathbf{x}}=(\\mathbf{A}^{H}\\mathbf{A})^{-1}\\mathbf{A}^{H}\\mathbf{b}",
        "note": "A 为列满秩实矩阵或复矩阵，求解 min ||Ax−b||₂²；数值计算通常采用 QR 或 SVD，避免显式求逆。"
      },
      {
        "id": "linear-28",
        "title": "Moore–Penrose 伪逆",
        "latex": "\\mathbf{A}^{+}=\\mathbf{V}\\mathbf{\\Sigma}^{+}\\mathbf{U}^{H}",
        "note": "基于 A = UΣVᴴ；Σ⁺ 将每个非零奇异值取倒数、零奇异值保持零，并交换矩阵行列数。"
      },
      {
        "id": "linear-29",
        "title": "Hermitian 正定矩阵",
        "latex": "\\mathbf{A}\\succ0\\quad\\Longleftrightarrow\\quad\\mathbf{x}^{H}\\mathbf{A}\\mathbf{x}>0\\quad\\text{对所有 }\\mathbf{x}\\ne\\mathbf{0}",
        "note": "A 为 Hermitian 方阵，即 Aᴴ = A；二次型为实数，正定等价于全部特征值严格为正。"
      },
      {
        "id": "linear-30",
        "title": "Cayley–Hamilton 定理",
        "latex": "p_{\\mathbf{A}}(\\mathbf{A})=\\mathbf{0}",
        "note": "p_A(λ) = det(λI−A)；将多项式中的 λᵏ 换成 Aᵏ、常数项换成该常数乘 I，任意方阵均满足。"
      }
    ]
  },
  {
    "id": "probability",
    "label": "概率论",
    "items": [
      {
        "id": "probability-01",
        "title": "补事件概率",
        "latex": "P(A^{c})=1-P(A)",
        "note": "Aᶜ 表示同一概率空间中事件 A 的补事件。"
      },
      {
        "id": "probability-02",
        "title": "两事件的加法公式",
        "latex": "P(A\\cup B)=P(A)+P(B)-P(A\\cap B)",
        "note": "A、B 为同一概率空间中的事件；减去交集以避免重复计数。"
      },
      {
        "id": "probability-03",
        "title": "条件概率",
        "latex": "P(A\\mid B)=\\frac{P(A\\cap B)}{P(B)}",
        "note": "要求 P(B) > 0；条件 B 改变所考察的样本空间。"
      },
      {
        "id": "probability-04",
        "title": "事件独立性",
        "latex": "A\\perp B\\quad\\Longleftrightarrow\\quad P(A\\cap B)=P(A)P(B)",
        "note": "这里的 ⟂ 表示事件独立；独立一般不同于互斥。"
      },
      {
        "id": "probability-05",
        "title": "全概率公式",
        "latex": "P(B)=\\sum_{i=1}^{n}P(B\\mid A_i)P(A_i)",
        "note": "A₁,…,Aₙ 两两互斥并构成完备事件组，且 P(Aᵢ) > 0。"
      },
      {
        "id": "probability-06",
        "title": "贝叶斯公式",
        "latex": "P(A\\mid B)=\\frac{P(B\\mid A)P(A)}{P(B)}",
        "note": "要求 P(A) > 0、P(B) > 0；P(A) 为先验，P(A|B) 为观察 B 后的条件概率。"
      },
      {
        "id": "probability-07",
        "title": "累积分布函数",
        "latex": "F_X(x)=P(X\\le x)",
        "note": "X 为实随机变量；F_X 单调不减且右连续，x 从负无穷到正无穷时极限从 0 到 1。"
      },
      {
        "id": "probability-08",
        "title": "连续型变量的区间概率",
        "latex": "P(a<X\\le b)=\\int_a^b f_X(x)\\,\\mathrm{d}x",
        "note": "X 具有概率密度 f_X，a < b；密度值本身不是单点概率，单点概率为零。"
      },
      {
        "id": "probability-09",
        "title": "离散随机变量期望",
        "latex": "\\mathbb{E}[X]=\\sum_x x\\,P(X=x)",
        "note": "对 X 的全部可能取值求和；这里要求 Σ|x|P(X=x) < ∞。"
      },
      {
        "id": "probability-10",
        "title": "连续随机变量期望",
        "latex": "\\mathbb{E}[X]=\\int_{-\\infty}^{\\infty}x f_X(x)\\,\\mathrm{d}x",
        "note": "X 有密度 f_X，且 ∫|x|f_X(x)dx < ∞。"
      },
      {
        "id": "probability-11",
        "title": "期望的线性性",
        "latex": "\\mathbb{E}[aX+bY+c]=a\\mathbb{E}[X]+b\\mathbb{E}[Y]+c",
        "note": "X、Y 可积，a、b、c 为实常数；不要求 X 与 Y 独立。"
      },
      {
        "id": "probability-12",
        "title": "总体方差",
        "latex": "\\operatorname{Var}(X)=\\mathbb{E}[(X-\\mathbb{E}[X])^2]=\\mathbb{E}[X^2]-(\\mathbb{E}[X])^2",
        "note": "X 为实随机变量且二阶矩有限；方差非负。"
      },
      {
        "id": "probability-13",
        "title": "总体协方差",
        "latex": "\\operatorname{Cov}(X,Y)=\\mathbb{E}[(X-\\mathbb{E}[X])(Y-\\mathbb{E}[Y])]",
        "note": "X、Y 为二阶矩有限的实随机变量；零协方差一般不等价于独立。"
      },
      {
        "id": "probability-14",
        "title": "总体相关系数",
        "latex": "\\rho_{XY}=\\frac{\\operatorname{Cov}(X,Y)}{\\sqrt{\\operatorname{Var}(X)\\operatorname{Var}(Y)}}",
        "note": "X、Y 的方差有限且严格为正；ρ ∈ [−1,1]，描述线性相关。"
      },
      {
        "id": "probability-15",
        "title": "和的方差",
        "latex": "\\operatorname{Var}(X+Y)=\\operatorname{Var}(X)+\\operatorname{Var}(Y)+2\\operatorname{Cov}(X,Y)",
        "note": "X、Y 为二阶矩有限的实随机变量；独立或不相关时协方差项为零。"
      },
      {
        "id": "probability-16",
        "title": "全期望公式",
        "latex": "\\mathbb{E}[X]=\\mathbb{E}[\\mathbb{E}[X\\mid Y]]",
        "note": "X 可积；先按 Y 求条件期望，再对 Y 的分布取平均。"
      },
      {
        "id": "probability-17",
        "title": "全方差公式",
        "latex": "\\operatorname{Var}(X)=\\mathbb{E}[\\operatorname{Var}(X\\mid Y)]+\\operatorname{Var}(\\mathbb{E}[X\\mid Y])",
        "note": "X 为二阶矩有限的实随机变量；将总体变动分为条件内和条件均值之间两部分。"
      },
      {
        "id": "probability-18",
        "title": "马尔可夫不等式",
        "latex": "P(X\\ge a)\\le\\frac{\\mathbb{E}[X]}{a}",
        "note": "X ≥ 0 几乎处处，E[X] 有限，a > 0。"
      },
      {
        "id": "probability-19",
        "title": "切比雪夫不等式",
        "latex": "P(|X-\\mu|\\ge\\varepsilon)\\le\\frac{\\sigma^2}{\\varepsilon^2}",
        "note": "μ = E[X]，σ² = Var(X) < ∞，ε > 0；不要求正态分布。"
      },
      {
        "id": "probability-20",
        "title": "弱大数定律",
        "latex": "\\frac{1}{n}\\sum_{i=1}^{n}X_i\\overset{P}{\\longrightarrow}\\mu",
        "note": "Xᵢ 独立同分布且 E[|Xᵢ|] < ∞，μ = E[Xᵢ]；箭头表示 n→∞ 时依概率收敛。"
      },
      {
        "id": "probability-21",
        "title": "二项分布",
        "latex": "P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}",
        "note": "n 为正整数，0 < p < 1，k=0,…,n；X 是 n 次独立且成功概率均为 p 的试验中的成功次数。"
      },
      {
        "id": "probability-22",
        "title": "几何分布",
        "latex": "P(X=k)=(1-p)^{k-1}p,\\quad k=1,2,\\ldots",
        "note": "0 < p < 1；X 计数独立重复试验中首次成功所需的总试验次数，包含成功的那次。"
      },
      {
        "id": "probability-23",
        "title": "超几何分布",
        "latex": "P(X=k)=\\frac{\\binom{K}{k}\\binom{N-K}{n-k}}{\\binom{N}{n}}",
        "note": "从 N 个对象中等概率不放回抽 n 个，其中 K 个为目标类；X 为抽中的目标数。整数参数 0≤K,n≤N，max(0,n−N+K)≤k≤min(K,n)。"
      },
      {
        "id": "probability-24",
        "title": "泊松分布",
        "latex": "P(X=k)=e^{-\\lambda}\\frac{\\lambda^k}{k!},\\quad k=0,1,2,\\ldots",
        "note": "λ > 0 为均值参数；用于具有适当独立增量条件的固定区间内事件计数。"
      },
      {
        "id": "probability-25",
        "title": "均匀分布密度",
        "latex": "f_X(x)=\\begin{cases}\\frac{1}{b-a},&a\\le x\\le b\\\\0,&\\text{其他}\\end{cases}",
        "note": "a < b；X 在 [a,b] 上连续均匀分布，区间端点处的密度赋值不影响概率。"
      },
      {
        "id": "probability-26",
        "title": "指数分布密度",
        "latex": "f_X(x)=\\begin{cases}\\lambda e^{-\\lambda x},&x\\ge0\\\\0,&x<0\\end{cases}",
        "note": "λ > 0 为速率参数，均值为 1/λ；常描述恒定事件速率模型中的等待时间。"
      },
      {
        "id": "probability-27",
        "title": "正态分布密度",
        "latex": "f_X(x)=\\frac{1}{\\sqrt{2\\pi}\\sigma}\\exp\\left[-\\frac{(x-\\mu)^2}{2\\sigma^2}\\right]",
        "note": "x、μ 为实数，σ > 0；X ~ N(μ,σ²)，此式为概率密度。"
      },
      {
        "id": "probability-28",
        "title": "Gamma 分布密度",
        "latex": "f_X(x)=\\frac{x^{\\alpha-1}e^{-x/\\theta}}{\\Gamma(\\alpha)\\theta^\\alpha},\\quad x>0",
        "note": "α > 0 为形状参数，θ > 0 为尺度参数；x < 0 时密度为 0，Γ 为 Gamma 函数。本式不用速率参数化。"
      },
      {
        "id": "probability-29",
        "title": "独立连续变量之和的密度",
        "latex": "f_{X+Y}(z)=\\int_{-\\infty}^{\\infty}f_X(x)f_Y(z-x)\\,\\mathrm{d}x",
        "note": "X、Y 独立且分别具有密度 f_X、f_Y；这是密度的卷积，缺少独立性时不能直接相乘。"
      },
      {
        "id": "probability-30",
        "title": "独立同分布中心极限定理",
        "latex": "\\frac{\\sqrt{n}(\\bar{X}_n-\\mu)}{\\sigma}\\overset{d}{\\longrightarrow}\\mathcal{N}(0,1)",
        "note": "Xᵢ 独立同分布，均值 μ 和方差 σ² 有限，σ > 0；X̄ₙ = ΣXᵢ/n，箭头表示 n→∞ 时依分布收敛。"
      }
    ]
  },
  {
    "id": "statistics",
    "label": "数理统计",
    "items": [
      {
        "id": "statistics-01",
        "title": "样本均值",
        "latex": "\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i",
        "note": "xᵢ 为 n 个实数观测值，n ≥ 1；对应随机样本均值可用于估计总体均值。"
      },
      {
        "id": "statistics-02",
        "title": "无偏样本方差",
        "latex": "s^2=\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i-\\bar{x})^2",
        "note": "n ≥ 2；独立同分布且总体方差有限时，对应统计量 S² 是总体方差的无偏估计。"
      },
      {
        "id": "statistics-03",
        "title": "样本协方差",
        "latex": "s_{xy}=\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i-\\bar{x})(y_i-\\bar{y})",
        "note": "n ≥ 2，(xᵢ,yᵢ) 为成对观测；独立同分布的观测对且二阶矩有限时，该式无偏估计总体协方差。"
      },
      {
        "id": "statistics-04",
        "title": "样本 Pearson 相关系数",
        "latex": "r=\\frac{\\sum_{i=1}^{n}(x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum_{i=1}^{n}(x_i-\\bar{x})^2\\sum_{i=1}^{n}(y_i-\\bar{y})^2}}",
        "note": "x 和 y 的样本离差平方和均须非零；r 描述样本中的线性相关，不代表因果关系。"
      },
      {
        "id": "statistics-05",
        "title": "样本均值标准误的估计",
        "latex": "\\widehat{\\operatorname{SE}}(\\bar{X})=\\frac{s}{\\sqrt{n}}",
        "note": "n ≥ 2，样本独立同分布且总体方差有限，s 为样本标准差；相关样本不能直接使用此式。"
      },
      {
        "id": "statistics-06",
        "title": "估计量的偏差",
        "latex": "\\operatorname{Bias}_{\\theta}(\\hat{\\theta})=\\mathbb{E}_{\\theta}[\\hat{\\theta}]-\\theta",
        "note": "θ 为待估实参数，期望对参数 θ 对应的重复抽样分布计算；期望须存在。"
      },
      {
        "id": "statistics-07",
        "title": "估计量均方误差分解",
        "latex": "\\operatorname{MSE}_{\\theta}(\\hat{\\theta})=\\operatorname{Var}_{\\theta}(\\hat{\\theta})+\\operatorname{Bias}_{\\theta}(\\hat{\\theta})^2",
        "note": "估计量二阶矩有限；MSE = Eθ[(θ̂−θ)²]，包含方差与偏差平方两部分。"
      },
      {
        "id": "statistics-08",
        "title": "经验分布函数",
        "latex": "\\hat{F}_n(x)=\\frac{1}{n}\\sum_{i=1}^{n}\\mathbf{1}_{\\{x_i\\le x\\}}",
        "note": "n ≥ 1，1_{条件} 在条件成立时为 1，否则为 0；表示不大于 x 的样本比例。"
      },
      {
        "id": "statistics-09",
        "title": "独立同分布样本的似然",
        "latex": "L(\\theta;\\mathbf{x})=\\prod_{i=1}^{n}f(x_i;\\theta)",
        "note": "观测 x₁,…,xₙ 来自独立同分布模型，f 为概率质量函数或密度；把数据固定，将 L 看成 θ 的函数。"
      },
      {
        "id": "statistics-10",
        "title": "最大似然估计",
        "latex": "\\hat{\\theta}_{\\mathrm{ML}}\\in\\operatorname{argmax}_{\\theta\\in\\Theta}L(\\theta;\\mathbf{x})",
        "note": "Θ 为参数空间；最大值存在时选择一个达到最大值的参数，多解时估计不唯一。"
      },
      {
        "id": "statistics-11",
        "title": "矩估计方程",
        "latex": "m_k(\\hat{\\boldsymbol{\\theta}})=\\frac{1}{n}\\sum_{i=1}^{n}x_i^k,\\quad k=1,\\ldots,p",
        "note": "θ 有 p 个待估参数，m_k(θ)=Eθ[Xᵏ] 存在；以样本原点矩代替理论矩，并检查方程解是否存在且落在参数空间内。"
      },
      {
        "id": "statistics-12",
        "title": "标量参数的 Fisher 信息",
        "latex": "I_n(\\theta)=\\mathbb{E}_{\\theta}\\left[\\left(\\frac{\\partial}{\\partial\\theta}\\log L(\\theta;\\mathbf{X})\\right)^2\\right]",
        "note": "L 为整个样本的似然；θ 为实标量参数，模型可微并满足相应正则条件，且平方期望有限。I_n 是总样本信息。"
      },
      {
        "id": "statistics-13",
        "title": "Cramér–Rao 下界",
        "latex": "\\operatorname{Var}_{\\theta}(\\hat{\\theta})\\ge\\frac{1}{I_n(\\theta)}",
        "note": "θ̂ 对标量 θ 无偏且方差有限，0 < I_n(θ) < ∞；要求公共支持集、可交换微分与积分等正则条件，不能直接用于参数依赖支持的非正则模型。"
      },
      {
        "id": "statistics-14",
        "title": "均值的已知方差置信区间",
        "latex": "\\bar{x}\\pm z_{1-\\alpha/2}\\frac{\\sigma}{\\sqrt{n}}",
        "note": "独立正态样本，总体标准差 σ > 0 已知，0 < α < 1；z_q 为标准正态的 q 分位数，区间置信水平为 1−α。"
      },
      {
        "id": "statistics-15",
        "title": "均值的未知方差置信区间",
        "latex": "\\bar{x}\\pm t_{1-\\alpha/2,n-1}\\frac{s}{\\sqrt{n}}",
        "note": "独立正态样本，n ≥ 2，总体方差未知且严格为正；s 为样本标准差，t_{q,ν} 为自由度 ν 的 t 分布 q 分位数，0 < α < 1。"
      },
      {
        "id": "statistics-16",
        "title": "正态总体方差置信区间",
        "latex": "\\left[\\frac{(n-1)s^2}{\\chi^2_{1-\\alpha/2,n-1}},\\frac{(n-1)s^2}{\\chi^2_{\\alpha/2,n-1}}\\right]",
        "note": "独立正态样本，总体方差严格为正，n ≥ 2，0 < α < 1；χ²_{q,ν} 按左尾累计概率 q 定义，区间置信水平 1−α。"
      },
      {
        "id": "statistics-17",
        "title": "单样本均值 t 检验",
        "latex": "T=\\frac{\\bar{X}-\\mu_0}{S/\\sqrt{n}}\\sim t_{n-1}\\quad(H_0:\\mu=\\mu_0)",
        "note": "独立正态样本，n ≥ 2，总体方差严格为正但未知；分布关系在原假设下成立，μ₀ 为待检验均值。"
      },
      {
        "id": "statistics-18",
        "title": "二项比例 Wilson 区间",
        "latex": "\\frac{\\hat{p}+z^2/(2n)\\ \\pm\\ z\\sqrt{\\hat{p}(1-\\hat{p})/n+z^2/(4n^2)}}{1+z^2/n}",
        "note": "n 次独立伯努利试验，p̂=k/n，n≥1，z=z_{1−α/2}，0<α<1；这是置信水平约为 1−α 的得分区间，有限样本覆盖率不恒等于名义值。"
      },
      {
        "id": "statistics-19",
        "title": "Welch 两样本均值检验",
        "latex": "T=\\frac{\\bar{X}_1-\\bar{X}_2-\\Delta_0}{\\sqrt{S_1^2/n_1+S_2^2/n_2}},\\quad \\nu\\approx\\frac{(S_1^2/n_1+S_2^2/n_2)^2}{(S_1^2/n_1)^2/(n_1-1)+(S_2^2/n_2)^2/(n_2-1)}",
        "note": "两组相互独立的正态样本，n₁,n₂≥2，方差不必相等；检验 μ₁−μ₂=Δ₀，以 t_ν 作近似参照，分母须为正。"
      },
      {
        "id": "statistics-20",
        "title": "似然比检验统计量",
        "latex": "\\Lambda=\\frac{\\sup_{\\theta\\in\\Theta_0}L(\\theta;\\mathbf{x})}{\\sup_{\\theta\\in\\Theta}L(\\theta;\\mathbf{x})},\\quad W=-2\\log\\Lambda",
        "note": "Θ₀⊂Θ 是原假设参数空间，似然上确界须有限且为正；W 越大越不支持原假设，参照分布取决于模型，卡方近似另需正则性与大样本条件。"
      },
      {
        "id": "statistics-21",
        "title": "卡方拟合优度检验",
        "latex": "X^2=\\sum_{j=1}^{k}\\frac{(O_j-E_j)^2}{E_j}",
        "note": "Oⱼ 为互斥且完备类别的观测频数，Eⱼ 为原假设期望频数且均为正；独立抽样、期望频数足够大且概率预先给定时参照 χ²_{k−1}，估计参数会改变自由度。"
      },
      {
        "id": "statistics-22",
        "title": "Bonferroni 多重检验",
        "latex": "p_i\\le\\frac{\\alpha}{m}\\quad\\Longrightarrow\\quad\\text{拒绝 }H_{0i}",
        "note": "同时检验 m 个假设，各 pᵢ 在相应原假设下有效；0<α<1，无需检验间独立，可将至少一次误拒的家族错误率控制在 α 以内。"
      },
      {
        "id": "statistics-23",
        "title": "单因素方差分析 F 统计量",
        "latex": "F=\\frac{\\sum_{j=1}^{k}n_j(\\bar{x}_j-\\bar{x})^2/(k-1)}{\\sum_{j=1}^{k}\\sum_{i=1}^{n_j}(x_{ij}-\\bar{x}_j)^2/(N-k)}",
        "note": "k≥2 组独立正态观测且方差相同，N=Σnⱼ>k，x̄ 为总样本均值；各总体均值相等时参照 F_{k−1,N−k}，分母须为正。"
      },
      {
        "id": "statistics-24",
        "title": "简单线性回归系数",
        "latex": "\\hat{\\beta}_1=\\frac{\\sum_{i=1}^{n}(x_i-\\bar{x})(y_i-\\bar{y})}{\\sum_{i=1}^{n}(x_i-\\bar{x})^2},\\quad\\hat{\\beta}_0=\\bar{y}-\\hat{\\beta}_1\\bar{x}",
        "note": "带截距的普通最小二乘直线 ŷᵢ=β̂₀+β̂₁xᵢ；x 的离差平方和须严格为正。"
      },
      {
        "id": "statistics-25",
        "title": "线性回归残差方差估计",
        "latex": "s^2=\\frac{1}{n-p}\\sum_{i=1}^{n}(y_i-\\hat{y}_i)^2",
        "note": "线性模型 y=Xβ+ε 的设计矩阵列满秩，p 计全部拟合系数（含截距时计入截距），n>p；误差均值为零、不相关且同方差时无偏估计误差方差。"
      },
      {
        "id": "statistics-26",
        "title": "简单回归斜率 t 检验",
        "latex": "T=\\frac{\\hat{\\beta}_1-\\beta_{1,0}}{s/\\sqrt{\\sum_{i=1}^{n}(x_i-\\bar{x})^2}}",
        "note": "含截距简单回归，固定 x 且不全相等，n>2，误差独立同分布为 N(0,σ²)、σ>0；s²=Σ(yᵢ−ŷᵢ)²/(n−2)，原假设下 T~t_{n−2}。"
      },
      {
        "id": "statistics-27",
        "title": "决定系数",
        "latex": "R^2=1-\\frac{\\sum_{i=1}^{n}(y_i-\\hat{y}_i)^2}{\\sum_{i=1}^{n}(y_i-\\bar{y})^2}",
        "note": "用于同一样本上带截距的普通最小二乘拟合，y 不全相等时 R²∈[0,1]；高 R² 不等于因果解释或良好的样本外预测。"
      },
      {
        "id": "statistics-28",
        "title": "逻辑回归概率模型",
        "latex": "P(Y=1\\mid\\mathbf{x})=\\frac{1}{1+\\exp[-(\\beta_0+\\boldsymbol{\\beta}^{T}\\mathbf{x})]}",
        "note": "Y∈{0,1}，x 为实预测变量向量；模型将事件概率的对数优势写成自变量的线性函数。"
      },
      {
        "id": "statistics-29",
        "title": "Akaike 信息准则",
        "latex": "\\mathrm{AIC}=2k-2\\log L(\\hat{\\boldsymbol{\\theta}};\\mathbf{x})",
        "note": "k 为拟合的自由参数总数，θ̂ 为最大似然估计；仅比较对同一观测数据、按可比较完整似然计算的候选模型，较小值通常优先。"
      },
      {
        "id": "statistics-30",
        "title": "Bootstrap 标准误估计",
        "latex": "\\widehat{\\operatorname{SE}}_{\\mathrm{boot}}=\\sqrt{\\frac{1}{B-1}\\sum_{b=1}^{B}(\\hat{\\theta}_b^{*}-\\bar{\\theta}^{*})^2}",
        "note": "B≥2；对独立同分布原始样本有放回抽取同样大小的 B 份重采样，θ̂* 是各次统计量，θ̄* 为其均值；该样本标准差估计重采样变动，适用性仍依赖统计量和抽样模型。"
      }
    ]
  },
  {
    "id": "signals",
    "label": "信号与系统",
    "items": [
      {
        "id": "signals-01",
        "title": "连续时间卷积",
        "latex": "y(t)=(x*h)(t)=\\int_{-\\infty}^{\\infty}x(\\tau)h(t-\\tau)\\,\\mathrm{d}\\tau",
        "note": "x(t) 为输入，h(t) 为连续时间线性时不变系统的冲激响应，y(t) 为零状态输出；积分须存在。"
      },
      {
        "id": "signals-02",
        "title": "冲激的筛选性质",
        "latex": "\\int_{-\\infty}^{\\infty}x(t)\\delta(t-t_0)\\,\\mathrm{d}t=x(t_0)",
        "note": "δ 为狄拉克冲激；x 在 t₀ 附近连续，等式按广义函数意义理解。"
      },
      {
        "id": "signals-03",
        "title": "连续时间 BIBO 稳定条件",
        "latex": "\\int_{-\\infty}^{\\infty}|h(t)|\\,\\mathrm{d}t<\\infty",
        "note": "对具有普通函数冲激响应的连续时间 LTI 系统，这是有界输入有界输出稳定的充要条件；含冲激的系统应按测度形式处理。"
      },
      {
        "id": "signals-04",
        "title": "连续时间傅里叶变换对",
        "latex": "X(\\omega)=\\int_{-\\infty}^{\\infty}x(t)e^{-\\mathrm{j}\\omega t}\\,\\mathrm{d}t,\\quad x(t)=\\frac{1}{2\\pi}\\int_{-\\infty}^{\\infty}X(\\omega)e^{\\mathrm{j}\\omega t}\\,\\mathrm{d}\\omega",
        "note": "采用角频率 ω，单位 rad/s；j² = −1，正变换取负指数、逆变换含 1/(2π)。在相应可积或均方意义下使用。"
      },
      {
        "id": "signals-05",
        "title": "连续时间傅里叶级数",
        "latex": "c_k=\\frac{1}{T_0}\\int_{t_0}^{t_0+T_0}x(t)e^{-\\mathrm{j}k\\omega_0t}\\,\\mathrm{d}t,\\quad x(t)=\\sum_{k=-\\infty}^{\\infty}c_ke^{\\mathrm{j}k\\omega_0t},\\quad \\omega_0=\\frac{2\\pi}{T_0}",
        "note": "x 为周期 T₀ 的信号，c_k 为复傅里叶系数；分段光滑信号在跳变处收敛到左右极限均值。"
      },
      {
        "id": "signals-06",
        "title": "连续信号能量的帕塞瓦尔等式",
        "latex": "\\int_{-\\infty}^{\\infty}|x(t)|^2\\,\\mathrm{d}t=\\frac{1}{2\\pi}\\int_{-\\infty}^{\\infty}|X(\\omega)|^2\\,\\mathrm{d}\\omega",
        "note": "x 为平方可积信号，X 采用负指数角频率傅里叶变换；复信号使用模平方。"
      },
      {
        "id": "signals-07",
        "title": "卷积定理",
        "latex": "\\mathcal{F}\\{x(t)*h(t)\\}=X(\\omega)H(\\omega)",
        "note": "连续时间卷积在频域变为乘积；傅里叶变换采用 ∫x(t)e^(−jωt)dt，相关变换和卷积须有定义。"
      },
      {
        "id": "signals-08",
        "title": "时间平移的频谱",
        "latex": "\\mathcal{F}\\{x(t-t_0)\\}=e^{-\\mathrm{j}\\omega t_0}X(\\omega)",
        "note": "t₀ > 0 表示延迟；X 使用负指数角频率傅里叶变换，延迟不改变幅度谱。"
      },
      {
        "id": "signals-09",
        "title": "复指数调制的频谱",
        "latex": "\\mathcal{F}\\{x(t)e^{\\mathrm{j}\\omega_ct}\\}=X(\\omega-\\omega_c)",
        "note": "ω_c 为载波角频率；以 e^(+jω_ct) 调制会把频谱向正频率移动 ω_c。"
      },
      {
        "id": "signals-10",
        "title": "时间尺度变换",
        "latex": "\\mathcal{F}\\{x(at)\\}=\\frac{1}{|a|}X\\!\\left(\\frac{\\omega}{a}\\right),\\quad a\\ne0",
        "note": "a 为非零实数；负 a 同时包含时间反转，幅度因子必须使用 |a|。"
      },
      {
        "id": "signals-11",
        "title": "时间微分与频域乘法",
        "latex": "\\mathcal{F}\\!\\left\\{\\frac{\\mathrm{d}x(t)}{\\mathrm{d}t}\\right\\}=\\mathrm{j}\\omega X(\\omega)",
        "note": "采用负指数傅里叶变换；普通函数推导要求相关导数可积且边界项消失，也可在广义函数意义下使用。"
      },
      {
        "id": "signals-12",
        "title": "实信号的共轭对称性",
        "latex": "x(t)\\in\\mathbb{R}\\quad\\Longrightarrow\\quad X(-\\omega)=X^{*}(\\omega)",
        "note": "X 采用连续时间傅里叶变换，* 表示复共轭；实信号的幅度谱为偶函数、相位谱在适当展开后为奇函数。"
      },
      {
        "id": "signals-13",
        "title": "能量信号自相关",
        "latex": "R_{xx}(\\tau)=\\int_{-\\infty}^{\\infty}x(t+\\tau)x^{*}(t)\\,\\mathrm{d}t,\\quad \\mathcal{F}_{\\tau}\\{R_{xx}\\}=|X(\\omega)|^2",
        "note": "x 为有限能量信号；此处是确定性自相关及能量谱，未使用随机过程的时间平均或期望定义。"
      },
      {
        "id": "signals-14",
        "title": "双边拉普拉斯变换",
        "latex": "X(s)=\\int_{-\\infty}^{\\infty}x(t)e^{-st}\\,\\mathrm{d}t,\\quad s=\\sigma+\\mathrm{j}\\omega",
        "note": "必须同时给出收敛域 ROC；同一有理表达式在不同 ROC 下可能代表不同信号。"
      },
      {
        "id": "signals-15",
        "title": "因果信号的拉普拉斯延迟",
        "latex": "\\mathcal{L}\\{x(t-t_0)u(t-t_0)\\}=e^{-st_0}X(s),\\quad t_0\\ge0",
        "note": "x 原本为因果信号，X 是其拉普拉斯变换；u 是单位阶跃，t₀ 为延迟。"
      },
      {
        "id": "signals-16",
        "title": "单边拉普拉斯微分公式",
        "latex": "\\mathcal{L}_{0^-}\\{x'(t)\\}=sX(s)-x(0^-)",
        "note": "使用从 0⁻ 开始的单边拉普拉斯变换；x(0⁻) 是初始值，不能在非零初始条件下省去。"
      },
      {
        "id": "signals-17",
        "title": "微分方程的传递函数",
        "latex": "\\sum_{k=0}^{N}a_k y^{(k)}(t)=\\sum_{k=0}^{M}b_k x^{(k)}(t),\\quad H(s)=\\frac{\\sum_{k=0}^{M}b_ks^k}{\\sum_{k=0}^{N}a_ks^k}",
        "note": "线性常系数系统；H(s)=Y(s)/X(s) 按零初始条件定义，分母多项式不恒为零。"
      },
      {
        "id": "signals-18",
        "title": "系统串联与并联",
        "latex": "H_{\\mathrm{series}}(s)=H_1(s)H_2(s),\\quad H_{\\mathrm{parallel}}(s)=H_1(s)+H_2(s)",
        "note": "适用于相容的标量 LTI 零状态系统；并联为输出相加，串联需不存在模型外的端口负载影响。"
      },
      {
        "id": "signals-19",
        "title": "负反馈闭环传递函数",
        "latex": "T(s)=\\frac{G(s)}{1+G(s)F(s)}",
        "note": "前向通道为 G，反馈通道为 F，误差定义 e=r−Fy；该表达式本身不保证闭环稳定。"
      },
      {
        "id": "signals-20",
        "title": "状态空间到传递函数",
        "latex": "\\dot{\\mathbf{x}}=\\mathbf{A}\\mathbf{x}+\\mathbf{B}u,\\quad y=\\mathbf{C}\\mathbf{x}+Du,\\quad H(s)=\\mathbf{C}(s\\mathbf{I}-\\mathbf{A})^{-1}\\mathbf{B}+D",
        "note": "连续时间、有限维、时不变状态模型，零初始状态；sI−A 须可逆，矩阵维度应相容。"
      },
      {
        "id": "signals-21",
        "title": "状态方程的时域解",
        "latex": "\\mathbf{x}(t)=e^{\\mathbf{A}(t-t_0)}\\mathbf{x}(t_0)+\\int_{t_0}^{t}e^{\\mathbf{A}(t-\\tau)}\\mathbf{B}u(\\tau)\\,\\mathrm{d}\\tau",
        "note": "A、B 为常矩阵；第一项是初始状态响应，第二项是输入引起的响应。"
      },
      {
        "id": "signals-22",
        "title": "拉普拉斯终值定理",
        "latex": "\\lim_{t\\to\\infty}x(t)=\\lim_{s\\to0}sX(s)",
        "note": "对因果信号的有理 X(s)，要求 sX(s) 的全部极点严格在左半平面；不能用于持续振荡或发散响应。"
      },
      {
        "id": "signals-23",
        "title": "二阶欠阻尼冲激响应",
        "latex": "h(t)=\\frac{\\omega_n^2}{\\omega_d}e^{-\\zeta\\omega_nt}\\sin(\\omega_dt)u(t),\\quad \\omega_d=\\omega_n\\sqrt{1-\\zeta^2}",
        "note": "对应 H(s)=ω_n²/(s²+2ζω_ns+ω_n²)，ω_n>0、0<ζ<1；u 是单位阶跃，系统静态增益为 1。"
      },
      {
        "id": "signals-24",
        "title": "矩形脉冲的频谱",
        "latex": "x(t)=A\\,\\operatorname{rect}\\!\\left(\\frac{t}{T}\\right),\\quad X(\\omega)=AT\\,\\operatorname{sinc}\\!\\left(\\frac{\\omega T}{2\\pi}\\right)",
        "note": "T>0，rect(t/T) 在 |t|<T/2 为 1、外部为 0；此处 sinc(u)=sin(πu)/(πu)，sinc(0)=1。"
      },
      {
        "id": "signals-25",
        "title": "周期信号的平均功率",
        "latex": "P_x=\\frac{1}{T_0}\\int_{t_0}^{t_0+T_0}|x(t)|^2\\,\\mathrm{d}t=\\sum_{k=-\\infty}^{\\infty}|c_k|^2",
        "note": "x 为周期 T₀ 的平方可积信号，c_k 为复傅里叶级数系数；P_x 是均方值，电功率需另考虑阻抗。"
      },
      {
        "id": "signals-26",
        "title": "希尔伯特变换",
        "latex": "\\hat{x}(t)=\\frac{1}{\\pi}\\operatorname{p.v.}\\int_{-\\infty}^{\\infty}\\frac{x(\\tau)}{t-\\tau}\\,\\mathrm{d}\\tau,\\quad \\hat{X}(\\omega)=-\\mathrm{j}\\operatorname{sgn}(\\omega)X(\\omega)",
        "note": "p.v. 表示柯西主值；采用负指数傅里叶变换，因此正频率相移为 −π/2。"
      },
      {
        "id": "signals-27",
        "title": "解析信号",
        "latex": "x_a(t)=x(t)+\\mathrm{j}\\hat{x}(t),\\quad X_a(\\omega)=[1+\\operatorname{sgn}(\\omega)]X(\\omega)",
        "note": "x 为实信号，x̂ 为希尔伯特变换；正频率加倍，负频率归零，取 sgn(0)=0 时直流保持。"
      },
      {
        "id": "signals-28",
        "title": "群时延",
        "latex": "\\tau_g(\\omega)=-\\frac{\\mathrm{d}}{\\mathrm{d}\\omega}\\arg H(\\omega)",
        "note": "H 在所考察频段非零且相位已连续展开；ω 的单位为 rad/s，群时延单位为秒。"
      },
      {
        "id": "signals-29",
        "title": "复指数的 LTI 特征函数性质",
        "latex": "x(t)=e^{st}\\quad\\Longrightarrow\\quad y(t)=H(s)e^{st}",
        "note": "连续时间 LTI 的零状态响应，要求 s 在冲激响应双边拉普拉斯变换 H(s) 的收敛域内。"
      },
      {
        "id": "signals-30",
        "title": "连续信号乘积的频谱",
        "latex": "\\mathcal{F}\\{x(t)y(t)\\}=\\frac{1}{2\\pi}\\int_{-\\infty}^{\\infty}X(\\nu)Y(\\omega-\\nu)\\,\\mathrm{d}\\nu",
        "note": "时域相乘对应角频率域卷积；1/(2π) 来自采用的连续时间傅里叶变换归一化。"
      }
    ]
  },
  {
    "id": "dsp",
    "label": "数字信号处理",
    "items": [
      {
        "id": "dsp-01",
        "title": "离散时间傅里叶变换对",
        "latex": "X(e^{\\mathrm{j}\\omega})=\\sum_{n=-\\infty}^{\\infty}x[n]e^{-\\mathrm{j}\\omega n},\\quad x[n]=\\frac{1}{2\\pi}\\int_{-\\pi}^{\\pi}X(e^{\\mathrm{j}\\omega})e^{\\mathrm{j}\\omega n}\\,\\mathrm{d}\\omega",
        "note": "ω 为 rad/sample，频谱以 2π 为周期；在相应收敛或均方意义下使用。"
      },
      {
        "id": "dsp-02",
        "title": "离散傅里叶变换对",
        "latex": "X[k]=\\sum_{n=0}^{N-1}x[n]e^{-\\mathrm{j}2\\pi kn/N},\\quad x[n]=\\frac{1}{N}\\sum_{k=0}^{N-1}X[k]e^{\\mathrm{j}2\\pi kn/N}",
        "note": "N 为正整数，n、k=0,…,N−1；采用正变换无归一化、逆变换除以 N 的约定。"
      },
      {
        "id": "dsp-03",
        "title": "双边 Z 变换",
        "latex": "X(z)=\\sum_{n=-\\infty}^{\\infty}x[n]z^{-n}",
        "note": "z 为复变量，必须注明收敛域；单位圆在 ROC 内时，可令 z=e^(jω) 得到 DTFT。"
      },
      {
        "id": "dsp-04",
        "title": "数字滤波器差分方程",
        "latex": "y[n]=\\sum_{k=0}^{M}b_kx[n-k]-\\sum_{k=1}^{N}a_ky[n-k]",
        "note": "分母首项已归一化为 a₀=1；a_k、b_k 为固定系数，递归实现还需初始状态。"
      },
      {
        "id": "dsp-05",
        "title": "数字滤波器零极点表达",
        "latex": "H(z)=Kz^{-d}\\frac{\\prod_{m=1}^{M}(1-z_mz^{-1})}{\\prod_{\\ell=1}^{N}(1-p_\\ell z^{-1})}",
        "note": "z_m、p_ℓ 列出非零有限零点和极点，K 为增益；整数 d 计入原点或无穷远处的阶数，d>0 表示纯延迟。还需给出 ROC。"
      },
      {
        "id": "dsp-06",
        "title": "对称 FIR 的线性相位",
        "latex": "h[n]=h[N-1-n]\\quad\\Longrightarrow\\quad H(e^{\\mathrm{j}\\omega})=e^{-\\mathrm{j}\\omega(N-1)/2}A(\\omega),\\quad A(\\omega)\\in\\mathbb{R}",
        "note": "h 为长度 N 的实对称 FIR；非零且 A 不变号的频段群时延为 (N−1)/2 个采样，零点处相位需单独处理。"
      },
      {
        "id": "dsp-07",
        "title": "因果有理数字系统稳定条件",
        "latex": "|p_\\ell|<1\\quad\\text{for every pole }p_\\ell",
        "note": "适用于约分后的因果有理 H(z)；全部极点严格在单位圆内才是 BIBO 稳定，不以被约掉的内部不稳定模态作内部稳定保证。"
      },
      {
        "id": "dsp-08",
        "title": "N 点循环卷积",
        "latex": "y[n]=\\sum_{m=0}^{N-1}x[m]h[(n-m)\\bmod N],\\quad Y[k]=X[k]H[k]",
        "note": "x、h 视为 N 周期序列，X、H、Y 使用 N 点 DFT；未经补零时循环卷积通常不等于有限序列的线性卷积。"
      },
      {
        "id": "dsp-09",
        "title": "FFT 计算线性卷积的补零",
        "latex": "x*h=\\operatorname{IDFT}_{N}\\!\\left\\{\\operatorname{DFT}_{N}(x)\\operatorname{DFT}_{N}(h)\\right\\},\\quad N\\ge L_x+L_h-1",
        "note": "有限序列 x、h 的长度为 L_x、L_h；先补零到 N 点，保留前 L_x+L_h−1 个输出即可得到线性卷积。"
      },
      {
        "id": "dsp-10",
        "title": "DFT 的帕塞瓦尔等式",
        "latex": "\\sum_{n=0}^{N-1}|x[n]|^2=\\frac{1}{N}\\sum_{k=0}^{N-1}|X[k]|^2",
        "note": "X 使用正变换无归一化的 N 点 DFT；它比较有限序列的能量，与连续时间积分的单位不同。"
      },
      {
        "id": "dsp-11",
        "title": "基二 FFT 蝶形",
        "latex": "X[k]=E[k]+W_N^kO[k],\\quad X[k+N/2]=E[k]-W_N^kO[k],\\quad W_N=e^{-\\mathrm{j}2\\pi/N}",
        "note": "N 为偶数，E、O 分别是偶数与奇数索引子序列的 N/2 点 DFT；k=0,…,N/2−1。递归基二 FFT 取 N 为 2 的幂。"
      },
      {
        "id": "dsp-12",
        "title": "带限采样的 sinc 重建",
        "latex": "x(t)=\\sum_{n=-\\infty}^{\\infty}x(nT_s)\\operatorname{sinc}\\!\\left(\\frac{t-nT_s}{T_s}\\right),\\quad f_s=\\frac{1}{T_s}>2B",
        "note": "x 的频谱在 |f|>B 为零，理想均匀采样且无混叠；sinc(u)=sin(πu)/(πu)，实际有限滤波器只能近似。"
      },
      {
        "id": "dsp-13",
        "title": "采样产生的频谱周期副本",
        "latex": "X_s(\\Omega)=\\frac{1}{T_s}\\sum_{k=-\\infty}^{\\infty}X_c(\\Omega-k\\Omega_s),\\quad \\Omega_s=\\frac{2\\pi}{T_s}",
        "note": "x_s(t)=Σx_c(nT_s)δ(t−nT_s)，Ω 为连续时间角频率 rad/s；副本重叠会产生混叠。"
      },
      {
        "id": "dsp-14",
        "title": "整数抽取的频谱",
        "latex": "y[n]=x[Mn],\\quad Y(e^{\\mathrm{j}\\omega})=\\frac{1}{M}\\sum_{r=0}^{M-1}X\\!\\left(e^{\\mathrm{j}(\\omega+2\\pi r)/M}\\right)",
        "note": "M 为正整数；为避免混叠，抽取前通常先把输入限制在 |ω|<π/M。"
      },
      {
        "id": "dsp-15",
        "title": "插零上采样的频谱",
        "latex": "y[n]=\\begin{cases}x[n/L],&n\\bmod L=0\\\\0,&\\text{otherwise}\\end{cases},\\quad Y(e^{\\mathrm{j}\\omega})=X(e^{\\mathrm{j}L\\omega})",
        "note": "L 为正整数；插零会产生频谱镜像，插值低通滤波器及其增益需要另行设置。"
      },
      {
        "id": "dsp-16",
        "title": "FIR 多相分解",
        "latex": "H(z)=\\sum_{r=0}^{M-1}z^{-r}E_r(z^M),\\quad E_r(z)=\\sum_{k}h[kM+r]z^{-k}",
        "note": "M 为正整数，将系数按索引模 M 分组；常用于抽取、插值和滤波器组的高效实现。"
      },
      {
        "id": "dsp-17",
        "title": "滑动平均滤波器频响",
        "latex": "H(e^{\\mathrm{j}\\omega})=\\frac{1}{M}e^{-\\mathrm{j}\\omega(M-1)/2}\\frac{\\sin(M\\omega/2)}{\\sin(\\omega/2)}",
        "note": "对应 h[n]=1/M，n=0,…,M−1；可去奇点按连续极限求值，直流增益为 1。"
      },
      {
        "id": "dsp-18",
        "title": "理想离散低通冲激响应",
        "latex": "h[n]=\\begin{cases}\\dfrac{\\sin(\\omega_cn)}{\\pi n},&n\\ne0\\\\[4pt]\\dfrac{\\omega_c}{\\pi},&n=0\\end{cases}",
        "note": "0<ω_c<π，通带增益为 1；该双边无限序列非因果，实际 FIR 设计需截断、加窗并延迟。"
      },
      {
        "id": "dsp-19",
        "title": "对称 Hann 窗",
        "latex": "w[n]=\\frac{1}{2}\\left[1-\\cos\\!\\left(\\frac{2\\pi n}{N-1}\\right)\\right],\\quad 0\\le n<N",
        "note": "N≥2，范围外取零；这是端点均为零的对称窗，区别于分母为 N 的周期 Hann 窗。"
      },
      {
        "id": "dsp-20",
        "title": "窗函数等效噪声带宽",
        "latex": "B_{\\mathrm{ENBW}}=f_s\\frac{\\sum_{n=0}^{N-1}|w[n]|^2}{\\left|\\sum_{n=0}^{N-1}w[n]\\right|^2}",
        "note": "以 Hz 计，f_s 为采样率，窗的直流和非零；比较窗在相同直流增益下收集白噪声的带宽。"
      },
      {
        "id": "dsp-21",
        "title": "加窗周期图",
        "latex": "\\hat{S}_{xx}(f)=\\frac{\\left|\\sum_{n=0}^{N-1}w[n]x[n]e^{-\\mathrm{j}2\\pi fn/f_s}\\right|^2}{f_s\\sum_{n=0}^{N-1}|w[n]|^2}",
        "note": "这是双边 PSD 估计，单位为输入单位平方/Hz；实信号改单边谱时，除直流和 Nyquist 点外需乘 2。"
      },
      {
        "id": "dsp-22",
        "title": "短时傅里叶变换",
        "latex": "X(m,\\omega)=\\sum_{n=-\\infty}^{\\infty}x[n]w[n-mR]e^{-\\mathrm{j}\\omega n}",
        "note": "w 为实分析窗，R 为帧移（采样点），m 为帧索引；本式保留全局时间相位，局部帧索引约定会改变相位因子。"
      },
      {
        "id": "dsp-23",
        "title": "平稳过程的功率谱",
        "latex": "R_{xx}[m]=\\mathbb{E}\\{x[n+m]x^{*}[n]\\},\\quad S_{xx}(e^{\\mathrm{j}\\omega})=\\sum_{m=-\\infty}^{\\infty}R_{xx}[m]e^{-\\mathrm{j}\\omega m}",
        "note": "x 为广义平稳离散随机过程；R 是包含均值贡献的自相关，不是去均值后的协方差。"
      },
      {
        "id": "dsp-24",
        "title": "复数维纳滤波正规方程",
        "latex": "\\mathbf{R}_{xx}\\mathbf{w}=\\mathbf{p}_{xd},\\quad \\mathbf{R}_{xx}=\\mathbb{E}[\\mathbf{x}\\mathbf{x}^{H}],\\quad \\mathbf{p}_{xd}=\\mathbb{E}[\\mathbf{x}d^{*}]",
        "note": "最小化 E|d−wᴴx|²，二阶矩有限；R 正定时解唯一。H 为共轭转置，交叉相关的共轭位置与输出定义一致。"
      },
      {
        "id": "dsp-25",
        "title": "双线性变换与预畸变",
        "latex": "s=\\frac{2}{T_s}\\frac{1-z^{-1}}{1+z^{-1}},\\quad \\Omega=\\frac{2}{T_s}\\tan\\!\\left(\\frac{\\omega}{2}\\right)",
        "note": "将模拟滤波器映射为数字滤波器；Ω 为 rad/s、ω 为 rad/sample。频率映射非线性，关键频率可先预畸变。"
      },
      {
        "id": "dsp-26",
        "title": "DFT 频率栅格",
        "latex": "f_k=\\frac{k f_s}{N},\\quad \\Delta f=\\frac{f_s}{N}",
        "note": "k=0,…,N−1；k>N/2 的栅格可解释为 f_k−f_s。Δf 是频点间隔，补零缩小间隔并不增加原记录的真实频率分辨能力。"
      },
      {
        "id": "dsp-27",
        "title": "均匀量化噪声模型",
        "latex": "e_q\\sim\\mathcal{U}\\!\\left(-\\frac{\\Delta}{2},\\frac{\\Delta}{2}\\right),\\quad \\mathbb{E}[e_q]=0,\\quad \\sigma_q^2=\\frac{\\Delta^2}{12}",
        "note": "Δ 为量化步长；在未过载、量化级足够密且误差近似均匀时使用。误差与信号独立是额外近似，不能由量化器本身保证。"
      },
      {
        "id": "dsp-28",
        "title": "复数 RLS 更新",
        "latex": "\\mathbf{k}_n=\\frac{\\mathbf{P}_{n-1}\\mathbf{x}_n}{\\lambda+\\mathbf{x}_n^H\\mathbf{P}_{n-1}\\mathbf{x}_n},\\quad e_n=d_n-\\mathbf{w}_{n-1}^H\\mathbf{x}_n,\\quad \\mathbf{w}_n=\\mathbf{w}_{n-1}+\\mathbf{k}_ne_n^*,\\quad \\mathbf{P}_n=\\lambda^{-1}(\\mathbf{P}_{n-1}-\\mathbf{k}_n\\mathbf{x}_n^H\\mathbf{P}_{n-1})",
        "note": "0<λ≤1 为遗忘因子，P₀ 为正定初始化的逆相关矩阵；使用 y=wᴴx 的复数权重约定。"
      },
      {
        "id": "dsp-29",
        "title": "重叠相加块卷积",
        "latex": "y[n]=\\sum_b (x_b*h)[n-bL],\\quad x_b[m]=\\begin{cases}x[bL+m],&0\\le m<L\\\\0,&\\text{otherwise}\\end{cases}",
        "note": "把输入切成互不重叠的 L 点块，每块与 h 做线性卷积后按 bL 对齐相加；FFT 实现仍需满足每块补零长度。"
      },
      {
        "id": "dsp-30",
        "title": "Goertzel 单频点递推",
        "latex": "q[n]=x[n]+2\\cos(\\omega_k)q[n-1]-q[n-2],\\quad X[k]=e^{-\\mathrm{j}\\omega_k(N-1)}(q[N-1]-e^{-\\mathrm{j}\\omega_k}q[N-2]),\\quad \\omega_k=\\frac{2\\pi k}{N}",
        "note": "q[−1]=q[−2]=0，递推处理 n=0,…,N−1；该终值含完整相位修正，得到正变换负指数的 N 点 DFT 第 k 点。"
      }
    ]
  },
  {
    "id": "communications",
    "label": "通信原理",
    "items": [
      {
        "id": "communications-01",
        "title": "符号率与未编码比特率",
        "latex": "R_b=R_s\\log_2M",
        "note": "每个符号映射 log₂M 个比特，M 为 2 的整数次幂；R_s 为 baud，R_b 为 bit/s，不含编码、导频或保护间隔开销。"
      },
      {
        "id": "communications-02",
        "title": "符号能量与比特能量",
        "latex": "E_s=E_b\\log_2M",
        "note": "等概率固定长度、未编码 M 元调制；E_b 按调制输入比特定义，若按信息比特计需再考虑码率。"
      },
      {
        "id": "communications-03",
        "title": "线性脉冲成形",
        "latex": "s(t)=\\sum_{k=-\\infty}^{\\infty}a_kp(t-kT)",
        "note": "a_k 为调制符号，p(t) 为发射脉冲，T 为符号间隔；脉冲能量归一化决定 |a_k|² 是否直接等于符号能量。"
      },
      {
        "id": "communications-04",
        "title": "实带通信号与复包络",
        "latex": "s_{\\mathrm{RF}}(t)=\\sqrt{2}\\operatorname{Re}\\{s_{\\mathrm{bb}}(t)e^{\\mathrm{j}2\\pi f_ct}\\}",
        "note": "采用 √2 的功率保持约定，s_bb 为窄带复包络、f_c 为载波频率；其他约定可能省去 √2，应同步调整能量定义。"
      },
      {
        "id": "communications-05",
        "title": "匹配滤波器",
        "latex": "h(t)=C\\,p^{*}(T_0-t)",
        "note": "对白加性噪声，匹配到已知脉冲 p(t) 可使 T₀ 时刻的输出 SNR 最大；C 为非零常数，* 为复共轭。"
      },
      {
        "id": "communications-06",
        "title": "Nyquist 零码间干扰条件",
        "latex": "g(nT)=\\begin{cases}1,&n=0\\\\0,&n\\ne0\\end{cases},\\quad n\\in\\mathbb{Z}",
        "note": "g 为发射滤波、信道及接收滤波合成后的脉冲，采样时刻已对齐；这里把主抽样值归一化为 1。"
      },
      {
        "id": "communications-07",
        "title": "升余弦脉冲",
        "latex": "g(t)=\\operatorname{sinc}\\!\\left(\\frac{t}{T}\\right)\\frac{\\cos(\\pi\\alpha t/T)}{1-(2\\alpha t/T)^2}",
        "note": "0≤α≤1 为滚降系数，sinc(u)=sin(πu)/(πu)、sinc(0)=1；α>0 时 t=±T/(2α) 处按连续极限取值。这是完整升余弦脉冲。"
      },
      {
        "id": "communications-08",
        "title": "升余弦基带带宽",
        "latex": "B=\\frac{1+\\alpha}{2T}=\\frac{1+\\alpha}{2}R_s",
        "note": "B 是复基带频谱支撑 [−B,B] 的正频率边界，单位 Hz；相应实带通信号的正频带宽为 2B。"
      },
      {
        "id": "communications-09",
        "title": "AWGN 最大似然符号检测",
        "latex": "\\hat{s}_{\\mathrm{ML}}=\\operatorname*{arg\\,min}_{a\\in\\mathcal{S}}|r-a|^2",
        "note": "接收模型 r=s+n，n 为方差相同的圆对称复高斯噪声，信道增益已补偿；等先验时也等于 MAP 检测。"
      },
      {
        "id": "communications-10",
        "title": "AWGN 最大后验符号检测",
        "latex": "\\hat{s}_{\\mathrm{MAP}}=\\operatorname*{arg\\,min}_{a\\in\\mathcal{S}}\\left(|r-a|^2-N_0\\ln P(a)\\right)",
        "note": "r=s+n，n~CN(0,N₀)，即 E|n|²=N₀；P(a)>0 为符号先验。非均匀先验时判决边界不一定为中垂线。"
      },
      {
        "id": "communications-11",
        "title": "比特对数似然比",
        "latex": "L_i(r)=\\ln\\frac{\\sum_{a\\in\\mathcal{S}_{i,1}}P(a)e^{-|r-a|^2/N_0}}{\\sum_{a\\in\\mathcal{S}_{i,0}}P(a)e^{-|r-a|^2/N_0}}",
        "note": "n~CN(0,N₀)，S_i,b 为第 i 个标签比特等于 b 的符号集合；这里正 LLR 支持比特 1，采用相反约定的译码器须换号。"
      },
      {
        "id": "communications-12",
        "title": "相干 BPSK 的误比特率",
        "latex": "P_b=Q\\!\\left(\\sqrt{\\frac{2E_b}{N_0}}\\right)",
        "note": "等概率 BPSK、AWGN、理想相干同步；实噪声双边 PSD 为 N₀/2，Q 为标准正态分布右尾概率。"
      },
      {
        "id": "communications-13",
        "title": "QPSK 星座",
        "latex": "s_m=\\sqrt{E_s}\\,e^{\\mathrm{j}(\\pi/4+m\\pi/2)},\\quad m\\in\\{0,1,2,3\\}",
        "note": "E_s 为符号能量，四点相位相差 π/2；该式不自动指定比特到符号的 Gray 映射。"
      },
      {
        "id": "communications-14",
        "title": "方形 QAM 的平均符号能量",
        "latex": "E_s=\\frac{2}{3}(M-1)d^2",
        "note": "M 为 4、16、64 等方形 QAM 阶数，符号等概率；每个实轴取 ±d、±3d 等电平，相邻点最小距离为 2d。"
      },
      {
        "id": "communications-15",
        "title": "误比特率样本估计",
        "latex": "\\widehat{\\mathrm{BER}}=\\frac{N_{\\mathrm{error}}}{N_{\\mathrm{bits}}}",
        "note": "分子为已完成比特对齐后统计的错误数，分母为比较总比特数且大于 0；有限样本估计需结合样本量解释。"
      },
      {
        "id": "communications-16",
        "title": "零误码观测的置信上界",
        "latex": "p_{\\mathrm{upper}}=1-\\alpha^{1/N}",
        "note": "N 个独立、错误概率相同的比特均无错误时，p_upper 是置信水平 1−α 的单侧精确二项上界，0<α<1；零观测错误不等于真实 BER 为零。"
      },
      {
        "id": "communications-17",
        "title": "AWGN 符号误差联合上界",
        "latex": "P_s\\le\\frac{1}{M}\\sum_{i=1}^{M}\\sum_{j\\ne i}Q\\!\\left(\\frac{|s_i-s_j|}{\\sqrt{2N_0}}\\right)",
        "note": "M 个符号等概率、n~CN(0,N₀)、最小距离检测；这是联合上界，数值可能超过 1，实际概率仍不超过 1。"
      },
      {
        "id": "communications-18",
        "title": "高斯 Q 函数",
        "latex": "Q(x)=\\frac{1}{\\sqrt{2\\pi}}\\int_x^\\infty e^{-u^2/2}\\,\\mathrm{d}u",
        "note": "x 为实数；通信误差公式中的 Q(x) 是单位方差、零均值高斯随机变量的右尾概率。"
      },
      {
        "id": "communications-19",
        "title": "带限 AWGN 信道容量",
        "latex": "C=B\\log_2\\!\\left(1+\\frac{P}{N_0B}\\right)",
        "note": "C 单位 bit/s，B 是实带通信道带宽（Hz），P 为平均接收信号功率，总带内噪声功率为 N₀B；需允许理想编码和高斯输入。"
      },
      {
        "id": "communications-20",
        "title": "容量边界上的每比特能量",
        "latex": "\\frac{E_b}{N_0}=\\frac{2^\\eta-1}{\\eta},\\quad \\eta=\\frac{C}{B}",
        "note": "这是理想 AWGN 容量边界，E_b=P/C、η 为 bit/s/Hz；η→0 时极限为 ln 2（约 −1.59 dB），实际系统通常需要更高值。"
      },
      {
        "id": "communications-21",
        "title": "离散无记忆信道容量",
        "latex": "C=\\max_{p(x)}\\sum_{x,y}p(x)p(y\\mid x)\\log_2\\frac{p(y\\mid x)}{\\sum_{x'}p(x')p(y\\mid x')}",
        "note": "C 单位 bit/次信道使用；对允许的输入分布最大化互信息，零概率项按连续极限处理。"
      },
      {
        "id": "communications-22",
        "title": "二元对称信道容量",
        "latex": "C=1-H_2(p),\\quad H_2(p)=-p\\log_2p-(1-p)\\log_2(1-p)",
        "note": "每次输入比特以概率 p 独立翻转，0≤p≤1；C 单位 bit/次信道使用，0 log₂0 取 0。"
      },
      {
        "id": "communications-23",
        "title": "分组码码率",
        "latex": "R_c=\\frac{k}{n},\\quad R_{\\mathrm{info}}=R_cR_{\\mathrm{coded}}",
        "note": "每个码字含 k 个信息比特和 n 个编码比特；不含其他帧开销，码率不等同于波特率。"
      },
      {
        "id": "communications-24",
        "title": "线性分组码编码与校验",
        "latex": "\\mathbf{c}=\\mathbf{u}\\mathbf{G}\\pmod2,\\quad \\mathbf{s}=\\mathbf{r}\\mathbf{H}^{T}\\pmod2,\\quad \\mathbf{G}\\mathbf{H}^{T}=\\mathbf{0}\\pmod2",
        "note": "u、c、r、s 均按行向量记；G 为 k×n、H 为 (n−k)×n 且各自满行秩，运算在 GF(2) 上。G 为生成矩阵，H 为校验矩阵。"
      },
      {
        "id": "communications-25",
        "title": "最小距离与纠错能力",
        "latex": "t=\\left\\lfloor\\frac{d_{\\min}-1}{2}\\right\\rfloor",
        "note": "最小汉明距离 d_min 的码可保证纠正任意不超过 t 位的错误；这是唯一译码的保证半径。"
      },
      {
        "id": "communications-26",
        "title": "汉明球打包界",
        "latex": "2^k\\sum_{i=0}^{t}\\binom{n}{i}\\le 2^n",
        "note": "二进制长度 n、含 2^k 个码字的码若能纠正任意 t 位错误，其半径 t 的汉明球必须互不重叠。"
      },
      {
        "id": "communications-27",
        "title": "Viterbi 路径度量递推",
        "latex": "M_k(s)=\\min_{s'\\to s}\\left[M_{k-1}(s')+\\lambda_k(s',s)\\right]",
        "note": "s 为当前格形状态，λ 为该支路的负对数似然度量；记录最优前驱并回溯才能输出序列，需给定合法初始状态。"
      },
      {
        "id": "communications-28",
        "title": "循环前缀 OFDM 子载波模型",
        "latex": "Y[m]=H[m]X[m]+W[m],\\quad N_{\\mathrm{CP}}\\ge L_h-1",
        "note": "信道在一个 OFDM 符号内近似不变，时域长度为 L_h；CP 足够、同步准确且去 CP 后做 DFT，方可把线性卷积化为各子载波相乘。"
      },
      {
        "id": "communications-29",
        "title": "Alamouti 两发射天线编码",
        "latex": "\\mathbf{X}=\\begin{bmatrix}s_1&s_2\\\\-s_2^*&s_1^*\\end{bmatrix},\\quad \\mathbf{X}^{H}\\mathbf{X}=(|s_1|^2+|s_2|^2)\\mathbf{I}",
        "note": "行对应连续两个时隙，列对应两个发射天线；信道在两时隙保持不变且接收端已知，才能利用正交性线性合并。"
      },
      {
        "id": "communications-30",
        "title": "级联接收机噪声因子",
        "latex": "F_{\\mathrm{total}}=F_1+\\frac{F_2-1}{G_1}+\\frac{F_3-1}{G_1G_2}+\\cdots",
        "note": "F_i 为各级线性噪声因子，G_i 为与噪声因子定义一致的可用功率增益；采用相同参考温度及适用的匹配条件，不能直接代入 dB 值。"
      }
    ]
  },
  {
    "id": "circuits",
    "label": "电路与电子学",
    "items": [
      {
        "id": "circuits-01",
        "title": "欧姆定律与电阻耗散",
        "latex": "v=Ri,\\quad p=vi=Ri^2=\\frac{v^2}{R}",
        "note": "R>0 为线性电阻，电流流入所标电压的正端；p≥0 表示吸收功率，单位 W。"
      },
      {
        "id": "circuits-02",
        "title": "基尔霍夫电流定律",
        "latex": "\\sum_{k=1}^{m}i_k=0",
        "note": "同一节点的支路电流先规定方向并带符号相加；适用于节点电荷积累可忽略的集总电路模型。"
      },
      {
        "id": "circuits-03",
        "title": "基尔霍夫电压定律",
        "latex": "\\sum_{k=1}^{m}v_k=0",
        "note": "沿闭合回路按一致参考方向求电压代数和；感应电动势必须纳入电路模型，不能忽略未建模的时变磁通。"
      },
      {
        "id": "circuits-04",
        "title": "电阻分压",
        "latex": "v_o=v_i\\frac{R_2}{R_1+R_2}",
        "note": "R₁、R₂ 串联，输出跨 R₂；输出端未接额外负载，或已把负载并入 R₂ 的等效值。"
      },
      {
        "id": "circuits-05",
        "title": "两支路电阻分流",
        "latex": "i_1=i_{\\mathrm{total}}\\frac{R_2}{R_1+R_2},\\quad i_2=i_{\\mathrm{total}}\\frac{R_1}{R_1+R_2}",
        "note": "R₁、R₂ 并联且均为正电阻；i_total 流入并联节点，两支路电流按流出节点方向计。"
      },
      {
        "id": "circuits-06",
        "title": "戴维南与诺顿等效",
        "latex": "I_N=\\frac{V_{\\mathrm{th}}}{R_{\\mathrm{th}}},\\quad R_N=R_{\\mathrm{th}},\\quad I_L=\\frac{V_{\\mathrm{th}}}{R_{\\mathrm{th}}+R_L}",
        "note": "线性直流一端口、R_th>0；V_th 是开路电压，I_N 是按对应极性定义的短路电流。受控源存在时不能简单关掉它们。"
      },
      {
        "id": "circuits-07",
        "title": "最大功率传输",
        "latex": "R_L=R_{\\mathrm{th}},\\quad P_{L,\\max}=\\frac{V_{\\mathrm{th}}^2}{4R_{\\mathrm{th}}}",
        "note": "实数直流戴维南源、R_th>0、可变纯电阻负载；该最大负载功率点的效率只有 50%。"
      },
      {
        "id": "circuits-08",
        "title": "理想电容的电流与储能",
        "latex": "i_C=C\\frac{\\mathrm{d}v_C}{\\mathrm{d}t},\\quad W_C=\\frac{1}{2}Cv_C^2",
        "note": "C 为与电压无关的正电容；电流流入电压正端，储能以 v_C=0 为参考。"
      },
      {
        "id": "circuits-09",
        "title": "理想电感的电压与储能",
        "latex": "v_L=L\\frac{\\mathrm{d}i_L}{\\mathrm{d}t},\\quad W_L=\\frac{1}{2}Li_L^2",
        "note": "L 为与电流无关的正电感，采用关联参考方向；忽略绕组电阻、磁芯损耗和饱和。"
      },
      {
        "id": "circuits-10",
        "title": "正弦稳态 RLC 阻抗",
        "latex": "Z_R=R,\\quad Z_L=\\mathrm{j}\\omega L,\\quad Z_C=\\frac{1}{\\mathrm{j}\\omega C}",
        "note": "采用 e^(jωt) 相量约定，ω>0 为 rad/s；相量与阻抗只描述同频正弦稳态，暂态需另算。"
      },
      {
        "id": "circuits-11",
        "title": "复功率",
        "latex": "S=V_{\\mathrm{rms}}I_{\\mathrm{rms}}^{*}=P+\\mathrm{j}Q",
        "note": "电压、电流为 RMS 相量，电流流入负载正端；P 为有功 W，Q 为无功 var。若用峰值相量，右式前须乘 1/2。"
      },
      {
        "id": "circuits-12",
        "title": "理想 LC 谐振频率",
        "latex": "\\omega_0=\\frac{1}{\\sqrt{LC}},\\quad f_0=\\frac{1}{2\\pi\\sqrt{LC}}",
        "note": "L、C>0；ω₀ 单位 rad/s，f₀ 单位 Hz。复杂拓扑和寄生参数会改变实际谐振。"
      },
      {
        "id": "circuits-13",
        "title": "串联 RLC 品质因数与带宽",
        "latex": "Q=\\frac{\\omega_0L}{R},\\quad \\Delta\\omega=\\frac{R}{L}=\\frac{\\omega_0}{Q}",
        "note": "串联 RLC、R>0，以电流或电阻功率的半功率点定义带宽；Δω 单位 rad/s，Δf=Δω/(2π)。"
      },
      {
        "id": "circuits-14",
        "title": "RC 一阶过渡响应",
        "latex": "v_C(t)=V_{\\infty}+[v_C(0^+)-V_{\\infty}]e^{-t/(R_{\\mathrm{eq}}C)},\\quad t\\ge0",
        "note": "切换后电路可化为恒定戴维南源与 R_eq>0；V_∞ 为最终电压，理想电容没有冲激电流时电压连续。"
      },
      {
        "id": "circuits-15",
        "title": "理想反相运算放大器",
        "latex": "v_o=-\\frac{R_f}{R_{\\mathrm{in}}}v_i",
        "note": "同相端接地，R_in 从输入接到反相端，R_f 从输出负反馈到反相端；理想运放在线性区，输出未饱和。"
      },
      {
        "id": "circuits-16",
        "title": "理想同相运算放大器",
        "latex": "v_o=\\left(1+\\frac{R_f}{R_g}\\right)v_i",
        "note": "输入接同相端，R_f 接输出与反相端，R_g 接反相端与地；理想负反馈且输出未饱和。"
      },
      {
        "id": "circuits-17",
        "title": "理想反相积分器",
        "latex": "v_o(t)=v_o(t_0)-\\frac{1}{RC}\\int_{t_0}^{t}v_i(\\tau)\\,\\mathrm{d}\\tau",
        "note": "输入电阻 R、反馈电容 C、同相端接地；理想线性运放。实际直流偏置会使输出漂移并可能饱和。"
      },
      {
        "id": "circuits-18",
        "title": "Shockley 二极管方程",
        "latex": "I_D=I_S\\left(e^{V_D/(nV_T)}-1\\right),\\quad V_T=\\frac{k_BT}{q}",
        "note": "I_S 为反向饱和电流，n 为理想因子，T 为绝对温度；忽略串联电阻、高注入和反向击穿。"
      },
      {
        "id": "circuits-19",
        "title": "二极管小信号电阻",
        "latex": "r_d=\\left(\\frac{\\mathrm{d}I_D}{\\mathrm{d}V_D}\\right)^{-1}=\\frac{nV_T}{I_D+I_S}\\approx\\frac{nV_T}{I_D}",
        "note": "围绕直流工作点线性化 Shockley 模型；近似要求 I_D≫I_S，且交流扰动足够小。"
      },
      {
        "id": "circuits-20",
        "title": "BJT 正向有源区集电极电流",
        "latex": "I_C\\approx I_Se^{V_{BE}/V_T}",
        "note": "NPN 管正向有源区，BE 正偏、BC 反偏；V_T=k_BT/q，忽略 Early 效应、高注入与漏电修正。"
      },
      {
        "id": "circuits-21",
        "title": "BJT 小信号参数",
        "latex": "g_m=\\frac{I_C}{V_T},\\quad r_{\\pi}=\\frac{\\beta}{g_m}",
        "note": "正向有源区直流偏置附近，β 为该工作点的低频小信号电流增益；g_m 单位 S，r_π 单位 Ω。"
      },
      {
        "id": "circuits-22",
        "title": "长沟道 NMOS 三极区电流",
        "latex": "I_D=\\mu_nC_{\\mathrm{ox}}\\frac{W}{L}\\left[(V_{GS}-V_{\\mathrm{th}})V_{DS}-\\frac{V_{DS}^2}{2}\\right]",
        "note": "V_GS>V_th 且 0≤V_DS<V_GS−V_th；长沟道平方律模型，忽略沟道长度调制、体效应和速度饱和。C_ox 为单位面积栅氧电容。"
      },
      {
        "id": "circuits-23",
        "title": "长沟道 NMOS 饱和区电流",
        "latex": "I_D=\\frac{1}{2}\\mu_nC_{\\mathrm{ox}}\\frac{W}{L}(V_{GS}-V_{\\mathrm{th}})^2(1+\\lambda V_{DS})",
        "note": "V_GS>V_th 且 V_DS≥V_GS−V_th；λ 为沟道长度调制参数。适用于简化强反型长沟道模型，不是现代器件精确模型。"
      },
      {
        "id": "circuits-24",
        "title": "MOS 饱和区小信号参数",
        "latex": "g_m\\approx\\frac{2I_D}{V_{GS}-V_{\\mathrm{th}}},\\quad r_o\\approx\\frac{1}{\\lambda I_D}",
        "note": "采用平方律工作点，过驱动电压为正；r_o 近似还要求 λV_DS≪1，λ=0 的理想模型有 r_o→∞。"
      },
      {
        "id": "circuits-25",
        "title": "共源放大器低频增益",
        "latex": "A_v\\approx-g_m(R_D\\parallel r_o\\parallel R_L)",
        "note": "源极在交流上接地、忽略体效应和寄生电容；R_D 为漏极电阻，R_L 为负载，∥ 表示并联等效。"
      },
      {
        "id": "circuits-26",
        "title": "电阻热噪声",
        "latex": "\\overline{v_n^2}=4k_BTRB",
        "note": "经典低频白噪声近似，R 为电阻、T 为 K，B 为单边等效噪声带宽（Hz）；这是开路均方噪声电压。"
      },
      {
        "id": "circuits-27",
        "title": "散粒噪声",
        "latex": "\\overline{i_n^2}=2qIB",
        "note": "I≥0 为独立电荷到达过程的平均电流，B 为单边等效噪声带宽；理想 Poisson 散粒噪声，不含倍增过剩噪声和相关抑制。"
      },
      {
        "id": "circuits-28",
        "title": "二端口阻抗参数",
        "latex": "\\begin{bmatrix}V_1\\\\V_2\\end{bmatrix}=\\begin{bmatrix}Z_{11}&Z_{12}\\\\Z_{21}&Z_{22}\\end{bmatrix}\\begin{bmatrix}I_1\\\\I_2\\end{bmatrix}",
        "note": "两个端口电流均规定流入网络；线性小信号或同频相量模型，Z 参数存在时各元素可由另一端口开路测得。"
      },
      {
        "id": "circuits-29",
        "title": "二端口散射参数",
        "latex": "\\mathbf{b}=\\mathbf{S}\\mathbf{a},\\quad a_i=\\frac{V_i+Z_0I_i}{2\\sqrt{Z_0}},\\quad b_i=\\frac{V_i-Z_0I_i}{2\\sqrt{Z_0}}",
        "note": "各端口使用相同实正参考阻抗 Z₀，V、I 为 RMS 相量且电流流入网络；|a_i|²、|b_i|² 分别为入射与出射功率。"
      },
      {
        "id": "circuits-30",
        "title": "传输线负载反射系数",
        "latex": "\\Gamma_L=\\frac{Z_L-Z_0}{Z_L+Z_0}",
        "note": "Z₀ 为实正特性阻抗，Z_L 为负载阻抗且分母非零；Γ_L 是负载处反射电压波与入射电压波之比。"
      }
    ]
  },
  {
    "id": "mechanics",
    "label": "经典力学",
    "items": [
      {
        "id": "mechanics-01",
        "title": "位置、速度与加速度",
        "latex": "\\mathbf{v}(t)=\\frac{\\mathrm{d}\\mathbf{r}}{\\mathrm{d}t},\\quad\\mathbf{a}(t)=\\frac{\\mathrm{d}\\mathbf{v}}{\\mathrm{d}t}",
        "note": "r(t) 为同一参考系中的位置向量，t 为时间；v 为瞬时速度，a 为瞬时加速度。"
      },
      {
        "id": "mechanics-02",
        "title": "匀加速直线运动",
        "latex": "x(t)=x_0+v_0t+\\frac{1}{2}at^2,\\quad v(t)=v_0+at",
        "note": "加速度 a 为常量；t=0 时位置 x₀、速度 v₀，所有量沿同一坐标轴取正负号。"
      },
      {
        "id": "mechanics-03",
        "title": "理想抛体轨迹",
        "latex": "y=y_0+x\\tan\\theta-\\frac{gx^2}{2v_0^2\\cos^2\\theta}",
        "note": "从 x=0、y=y₀ 以速度 v₀>0、仰角 θ 发射；竖直向上为正，g>0 恒定，cos θ≠0，忽略空气阻力。"
      },
      {
        "id": "mechanics-04",
        "title": "匀速圆周运动加速度",
        "latex": "\\mathbf{a}=-\\frac{v^2}{R}\\,\\mathbf{e}_r",
        "note": "R>0 为圆周半径，v 为速率，e_r 为从圆心向外的径向单位向量；负号表示加速度指向圆心。"
      },
      {
        "id": "mechanics-05",
        "title": "牛顿第二定律",
        "latex": "\\sum\\mathbf{F}=m\\mathbf{a}",
        "note": "在惯性参考系中描述质量 m 恒定的质点；左侧为作用于该质点的合外力。"
      },
      {
        "id": "mechanics-06",
        "title": "质点动量",
        "latex": "\\mathbf{p}=m\\mathbf{v}",
        "note": "经典非相对论范围内，m 为质点质量，v 为相对所选惯性参考系的速度。"
      },
      {
        "id": "mechanics-07",
        "title": "冲量—动量定理",
        "latex": "\\mathbf{J}=\\int_{t_1}^{t_2}\\mathbf{F}_{\\mathrm{net}}(t)\\,\\mathrm{d}t=\\mathbf{p}_2-\\mathbf{p}_1",
        "note": "J 为合力在该时间段内的冲量；惯性系中对同一质点使用，p₁、p₂ 为两端时刻动量。"
      },
      {
        "id": "mechanics-08",
        "title": "平动动能",
        "latex": "K=\\frac{1}{2}mv^2",
        "note": "m 为质点质量，v 为相对所选惯性参考系的速率；适用于经典非相对论运动。"
      },
      {
        "id": "mechanics-09",
        "title": "变力做功",
        "latex": "W=\\int_C\\mathbf{F}\\cdot\\mathrm{d}\\mathbf{r}",
        "note": "沿质点实际路径 C 对所考察的力 F 作线积分；点积只计沿位移方向的力分量。"
      },
      {
        "id": "mechanics-10",
        "title": "动能定理",
        "latex": "W_{\\mathrm{net}}=K_2-K_1",
        "note": "质量恒定的质点在惯性系中，合力做功等于其动能变化；W_net 包括所有作用力的功。"
      },
      {
        "id": "mechanics-11",
        "title": "瞬时机械功率",
        "latex": "P=\\frac{\\mathrm{d}W}{\\mathrm{d}t}=\\mathbf{F}\\cdot\\mathbf{v}",
        "note": "F 为对运动质点做功的力，v 为该质点在同一参考系的速度；功率可以为负。"
      },
      {
        "id": "mechanics-12",
        "title": "胡克定律",
        "latex": "F_x=-kx",
        "note": "理想线性弹簧，k>0 为劲度系数，x 为相对平衡长度的有向伸长量；弹性范围内恢复力与位移反向。"
      },
      {
        "id": "mechanics-13",
        "title": "近地面重力势能",
        "latex": "U=mgh",
        "note": "均匀重力场近似下，g>0 为重力加速度大小，h 为相对选定零势能面的高度，竖直向上为正。"
      },
      {
        "id": "mechanics-14",
        "title": "机械能守恒",
        "latex": "K_1+U_1=K_2+U_2",
        "note": "系统只受保守力做功，势能不显含时间；U 须包含所考虑的保守相互作用势能。"
      },
      {
        "id": "mechanics-15",
        "title": "离散质点系质心",
        "latex": "\\mathbf{R}_{\\mathrm{cm}}=\\frac{\\sum_{i=1}^{N}m_i\\mathbf{r}_i}{\\sum_{i=1}^{N}m_i}",
        "note": "mᵢ>0，rᵢ 为各质点在同一时刻、同一参考系中的位置向量；总质量不为零。"
      },
      {
        "id": "mechanics-16",
        "title": "质点系动量守恒",
        "latex": "\\sum_{i=1}^{N}\\mathbf{p}_{i,\\mathrm{initial}}=\\sum_{i=1}^{N}\\mathbf{p}_{i,\\mathrm{final}}",
        "note": "对固定的一组经典质点，内部作用满足动量守恒；两时刻之间合外力冲量为零时，总动量相等。"
      },
      {
        "id": "mechanics-17",
        "title": "力矩",
        "latex": "\\boldsymbol{\\tau}_O=\\mathbf{r}\\times\\mathbf{F}",
        "note": "r 从参考点 O 指向力的作用点；力矩方向按右手规则，大小为 rF sin θ。"
      },
      {
        "id": "mechanics-18",
        "title": "质点角动量",
        "latex": "\\mathbf{L}_O=\\mathbf{r}\\times\\mathbf{p}",
        "note": "r 从参考点 O 指向质点；p 为质点动量，角动量依赖所选参考点。"
      },
      {
        "id": "mechanics-19",
        "title": "绕定轴的转动惯量",
        "latex": "I=\\int r_\\perp^2\\,\\mathrm{d}m",
        "note": "r_⊥ 为质量微元到转轴的垂直距离；离散质点系对应 I=Σmᵢr_{⊥,i}²。"
      },
      {
        "id": "mechanics-20",
        "title": "平行轴定理",
        "latex": "I=I_{\\mathrm{cm}}+Md^2",
        "note": "两根转轴互相平行，其中一根穿过质心；M 为总质量，d 为两轴垂直距离。"
      },
      {
        "id": "mechanics-21",
        "title": "定轴转动的动力学",
        "latex": "\\tau_{\\mathrm{net},z}=I_z\\alpha",
        "note": "刚体绕惯性系中的固定 z 轴转动，I_z 为常量，α 为角加速度；只取合外力矩沿该轴的分量。"
      },
      {
        "id": "mechanics-22",
        "title": "定轴转动动能",
        "latex": "K_{\\mathrm{rot}}=\\frac{1}{2}I\\omega^2",
        "note": "刚体绕固定轴转动，I 为关于该轴的转动惯量，ω 为角速率。"
      },
      {
        "id": "mechanics-23",
        "title": "平面纯滚动",
        "latex": "v_{\\mathrm{cm}}=R\\omega,\\quad K=\\frac{1}{2}Mv_{\\mathrm{cm}}^2+\\frac{1}{2}I_{\\mathrm{cm}}\\omega^2",
        "note": "半径 R 的刚体在静止平面上无滑动滚动；v_cm、ω 取非负大小，I_cm 为通过质心且垂直运动平面的轴的转动惯量。"
      },
      {
        "id": "mechanics-24",
        "title": "万有引力大小",
        "latex": "F=G\\frac{m_1m_2}{r^2}",
        "note": "两质点质量 m₁、m₂，距离 r>0，G 为万有引力常数；力沿连线相互吸引，互不重叠的球对称物体也可按质心间距使用。"
      },
      {
        "id": "mechanics-25",
        "title": "万有引力势能",
        "latex": "U(r)=-\\frac{GMm}{r}",
        "note": "两质点或互不重叠球对称物体，r 为中心距离；取无限远处势能为零。"
      },
      {
        "id": "mechanics-26",
        "title": "逃逸速率",
        "latex": "v_{\\mathrm{esc}}=\\sqrt{\\frac{2GM}{R}}",
        "note": "从质量 M 的孤立球对称天体表面半径 R 处逃至无穷远，忽略空气阻力、天体自转及其他天体；试验物体质量远小于 M。"
      },
      {
        "id": "mechanics-27",
        "title": "开普勒第三定律",
        "latex": "T^2=\\frac{4\\pi^2a^3}{G(M+m)}",
        "note": "理想牛顿二体引力束缚椭圆轨道；a 为相对运动轨道的半长轴，T 为周期，M、m 为两体质量。m≪M 时分母常近似为 GM。"
      },
      {
        "id": "mechanics-28",
        "title": "弹簧简谐振子",
        "latex": "m\\ddot{x}+kx=0,\\quad x(t)=A\\cos(\\omega_0t+\\phi),\\quad\\omega_0=\\sqrt{\\frac{k}{m}}",
        "note": "m>0、k>0，理想线性弹簧，无阻尼与外驱动；x 相对平衡位置测量，A、φ 由初始条件确定。"
      },
      {
        "id": "mechanics-29",
        "title": "小角度单摆周期",
        "latex": "T\\approx2\\pi\\sqrt{\\frac{\\ell}{g}}",
        "note": "长度 ℓ 的无质量不可伸长摆线悬挂质点，均匀重力场，忽略阻力；摆角振幅远小于 1 弧度时成立。"
      },
      {
        "id": "mechanics-30",
        "title": "拉格朗日方程",
        "latex": "\\frac{\\mathrm{d}}{\\mathrm{d}t}\\frac{\\partial L}{\\partial\\dot{q}_i}-\\frac{\\partial L}{\\partial q_i}=0,\\quad L=T-V",
        "note": "qᵢ 为满足完整约束后的独立广义坐标；此处取惯性系中动能 T、只依赖坐标和时间的势能 V，且无未计入势能的广义外力。"
      }
    ]
  },
  {
    "id": "electromagnetism",
    "label": "电磁学",
    "items": [
      {
        "id": "electromagnetism-01",
        "title": "点电荷间的库仑力",
        "latex": "\\mathbf{F}_{12}=\\frac{q_1q_2}{4\\pi\\varepsilon}\\frac{\\mathbf{r}_1-\\mathbf{r}_2}{|\\mathbf{r}_1-\\mathbf{r}_2|^3}",
        "note": "F₁₂ 为电荷 q₂ 对 q₁ 的力；均匀、无限、线性各向同性介质的静电模型，两个位置不同。"
      },
      {
        "id": "electromagnetism-02",
        "title": "体电荷的静电势",
        "latex": "V(\\mathbf{r})=\\frac{1}{4\\pi\\varepsilon}\\int\\frac{\\rho(\\mathbf{r}')}{|\\mathbf{r}-\\mathbf{r}'|}\\,\\mathrm{d}^3r'",
        "note": "ρ 为体电荷密度，均匀无限介质；选无穷远电势为零，电荷分布及积分须满足该参考可用的衰减条件。"
      },
      {
        "id": "electromagnetism-03",
        "title": "电势与静电场",
        "latex": "\\mathbf{E}=-\\nabla V",
        "note": "适用于静电场或无感应旋度项的电势部分；一般时变电磁场还需加入 −∂A/∂t。"
      },
      {
        "id": "electromagnetism-04",
        "title": "理想电偶极子的远场电势",
        "latex": "V(\\mathbf{r})=\\frac{\\mathbf{p}\\cdot\\hat{\\mathbf{r}}}{4\\pi\\varepsilon r^2}",
        "note": "p 为电偶极矩，方向由负电荷指向正电荷；静电且观察距离远大于偶极尺寸，原点取在偶极附近。"
      },
      {
        "id": "electromagnetism-05",
        "title": "电位移的高斯定律",
        "latex": "\\oint_{\\partial V}\\mathbf{D}\\cdot\\mathrm{d}\\mathbf{S}=Q_{\\mathrm{free},V}",
        "note": "闭合曲面的面积矢量指向外侧；右侧只计包围的自由电荷，束缚电荷已由 D 的定义处理。"
      },
      {
        "id": "electromagnetism-06",
        "title": "均匀介质中的泊松方程",
        "latex": "\\nabla^2V=-\\frac{\\rho_{\\mathrm{free}}}{\\varepsilon}",
        "note": "静电、ε 为位置无关的标量；非均匀介质应使用 ∇·(ε∇V)=−ρ_free，并配合边界条件。"
      },
      {
        "id": "electromagnetism-07",
        "title": "静电介质边界条件",
        "latex": "\\hat{\\mathbf{n}}\\cdot(\\mathbf{D}_2-\\mathbf{D}_1)=\\rho_s,\\quad \\hat{\\mathbf{n}}\\times(\\mathbf{E}_2-\\mathbf{E}_1)=\\mathbf{0}",
        "note": "n 从介质 1 指向介质 2，ρ_s 为自由面电荷密度；取无奇异表面电动势的静电界面。"
      },
      {
        "id": "electromagnetism-08",
        "title": "平行板电容的几何关系",
        "latex": "C=\\frac{\\varepsilon A}{d}",
        "note": "均匀介质填满平行板间隙，板面积 A、间距 d；板的横向尺寸远大于 d，忽略边缘场。"
      },
      {
        "id": "electromagnetism-09",
        "title": "静电场储能",
        "latex": "U_E=\\frac{1}{2}\\int_V\\mathbf{E}\\cdot\\mathbf{D}\\,\\mathrm{d}V",
        "note": "线性、无损、无色散介质；积分覆盖所讨论的电场区域。非线性介质需要沿构成关系积分。"
      },
      {
        "id": "electromagnetism-10",
        "title": "电极化与束缚电荷",
        "latex": "\\mathbf{D}=\\varepsilon_0\\mathbf{E}+\\mathbf{P},\\quad \\rho_b=-\\nabla\\cdot\\mathbf{P},\\quad \\sigma_b=\\mathbf{P}\\cdot\\hat{\\mathbf{n}}",
        "note": "P 为极化强度，ρ_b 为体束缚电荷密度，σ_b 为介质外表面的束缚面电荷；n 为介质向外法向。"
      },
      {
        "id": "electromagnetism-11",
        "title": "电荷连续性方程",
        "latex": "\\frac{\\partial\\rho}{\\partial t}+\\nabla\\cdot\\mathbf{J}=0",
        "note": "ρ、J 应为同一电荷类别的密度与电流密度；方程表达局部电荷守恒，不能混用自由与总电荷。"
      },
      {
        "id": "electromagnetism-12",
        "title": "毕奥–萨伐尔定律",
        "latex": "\\mathbf{B}(\\mathbf{r})=\\frac{\\mu}{4\\pi}\\int\\frac{\\mathbf{J}(\\mathbf{r}')\\times(\\mathbf{r}-\\mathbf{r}')}{|\\mathbf{r}-\\mathbf{r}'|^3}\\,\\mathrm{d}^3r'",
        "note": "稳恒电流、均匀无限线性介质，μ 为磁导率；时变辐射问题不能直接忽略传播延迟使用此式。"
      },
      {
        "id": "electromagnetism-13",
        "title": "磁通链与自感",
        "latex": "L=\\frac{\\Psi}{I},\\quad \\Psi=\\sum_{k=1}^{N}\\Phi_k",
        "note": "线性磁路、无外加独立磁通时定义自感；Ψ 为各匝磁通之和，若各匝相同则 Ψ=NΦ，单位 Wb·turn。"
      },
      {
        "id": "electromagnetism-14",
        "title": "磁矢势",
        "latex": "\\mathbf{A}(\\mathbf{r})=\\frac{\\mu}{4\\pi}\\int\\frac{\\mathbf{J}(\\mathbf{r}')}{|\\mathbf{r}-\\mathbf{r}'|}\\,\\mathrm{d}^3r',\\quad \\mathbf{B}=\\nabla\\times\\mathbf{A}",
        "note": "均匀无限介质中的局域稳恒电流，可取库仑规范；A 不是唯一的，增加梯度不改变 B。"
      },
      {
        "id": "electromagnetism-15",
        "title": "洛伦兹力",
        "latex": "\\mathbf{F}=q(\\mathbf{E}+\\mathbf{v}\\times\\mathbf{B})",
        "note": "q 为带符号的电荷，v 为其速度，E、B 为粒子处的外场；磁力项不对点粒子做功。"
      },
      {
        "id": "electromagnetism-16",
        "title": "载流导线的磁力",
        "latex": "\\mathbf{F}=I\\int_C\\mathrm{d}\\boldsymbol{\\ell}\\times\\mathbf{B}",
        "note": "细导线中的稳恒电流 I，dℓ 沿电流正方向；B 为外加磁场，不把导线自身的奇异场直接代入。"
      },
      {
        "id": "electromagnetism-17",
        "title": "磁偶极矩的力矩",
        "latex": "\\boldsymbol{\\tau}=\\mathbf{m}\\times\\mathbf{B},\\quad \\mathbf{m}=IA\\hat{\\mathbf{n}}",
        "note": "小平面电流环，A 为面积，n 按电流右手定则确定；外磁场在环的尺度上近似均匀。"
      },
      {
        "id": "electromagnetism-18",
        "title": "磁场的高斯定律",
        "latex": "\\oint_{\\partial V}\\mathbf{B}\\cdot\\mathrm{d}\\mathbf{S}=0",
        "note": "任意闭合曲面，面积矢量向外；表达经典电磁学中不存在孤立磁单极源。"
      },
      {
        "id": "electromagnetism-19",
        "title": "法拉第电磁感应定律",
        "latex": "\\oint_{\\partial S}\\mathbf{E}\\cdot\\mathrm{d}\\boldsymbol{\\ell}=-\\frac{\\mathrm{d}}{\\mathrm{d}t}\\int_S\\mathbf{B}\\cdot\\mathrm{d}\\mathbf{S}",
        "note": "曲线和曲面固定不动，并按右手定则关联方向；运动回路的电动势还需计入 v×B。"
      },
      {
        "id": "electromagnetism-20",
        "title": "安培–麦克斯韦定律",
        "latex": "\\oint_{\\partial S}\\mathbf{H}\\cdot\\mathrm{d}\\boldsymbol{\\ell}=\\int_S\\left(\\mathbf{J}_{\\mathrm{free}}+\\frac{\\partial\\mathbf{D}}{\\partial t}\\right)\\cdot\\mathrm{d}\\mathbf{S}",
        "note": "曲线、曲面固定且方向相容；右侧为自由传导电流与位移电流，不能在时变问题中任意省去后者。"
      },
      {
        "id": "electromagnetism-21",
        "title": "线性各向同性介质构成关系",
        "latex": "\\mathbf{D}=\\varepsilon\\mathbf{E},\\quad \\mathbf{B}=\\mu\\mathbf{H},\\quad \\mathbf{J}_{\\mathrm{cond}}=\\sigma\\mathbf{E}",
        "note": "简单线性各向同性介质的局部模型；时域常数关系还要求无明显色散，ε、μ、σ 分别为介电常数、磁导率、电导率。"
      },
      {
        "id": "electromagnetism-22",
        "title": "坡印廷矢量",
        "latex": "\\mathbf{S}=\\mathbf{E}\\times\\mathbf{H},\\quad \\langle\\mathbf{S}\\rangle=\\frac{1}{2}\\operatorname{Re}(\\tilde{\\mathbf{E}}\\times\\tilde{\\mathbf{H}}^{*})",
        "note": "第一式为瞬时功率流密度 W/m²；第二式使用峰值相量给出正弦稳态周期平均，若用 RMS 相量则去掉 1/2。"
      },
      {
        "id": "electromagnetism-23",
        "title": "坡印廷能量守恒",
        "latex": "\\frac{\\partial u}{\\partial t}+\\nabla\\cdot\\mathbf{S}=-\\mathbf{J}\\cdot\\mathbf{E},\\quad u=\\frac{1}{2}(\\mathbf{E}\\cdot\\mathbf{D}+\\mathbf{B}\\cdot\\mathbf{H})",
        "note": "采用线性无色散、实数且时不变的 ε、μ；J 为不含位移电流的自由电流，包含导电耗散或外源做功。"
      },
      {
        "id": "electromagnetism-24",
        "title": "无源均匀介质电场波动方程",
        "latex": "\\nabla^2\\mathbf{E}-\\mu\\varepsilon\\frac{\\partial^2\\mathbf{E}}{\\partial t^2}=\\mathbf{0}",
        "note": "均匀、线性、各向同性、无损介质，区域内无自由电荷和电流；不适用于直接忽略导电损耗的良导体。"
      },
      {
        "id": "electromagnetism-25",
        "title": "无损介质波速与波阻抗",
        "latex": "v=\\frac{1}{\\sqrt{\\mu\\varepsilon}},\\quad \\eta=\\sqrt{\\frac{\\mu}{\\varepsilon}}",
        "note": "μ、ε 为实正常数；v 单位 m/s、η 单位 Ω。此处为均匀无损介质平面波，不是任意波导的模阻抗。"
      },
      {
        "id": "electromagnetism-26",
        "title": "行进平面波的场方向",
        "latex": "\\tilde{\\mathbf{H}}=\\frac{1}{\\eta}\\hat{\\mathbf{k}}\\times\\tilde{\\mathbf{E}}",
        "note": "均匀无损介质的单一行进平面波，k̂ 为传播方向；E、H、k̂ 形成右手关系，η 为介质波阻抗。"
      },
      {
        "id": "electromagnetism-27",
        "title": "有耗介质传播常数",
        "latex": "\\gamma=\\alpha+\\mathrm{j}\\beta=\\sqrt{\\mathrm{j}\\omega\\mu(\\sigma+\\mathrm{j}\\omega\\varepsilon)}",
        "note": "均匀各向同性介质，实数 ε、μ>0，σ≥0、ω>0；取 e^(jωt) 和沿 +z 的 e^(−γz)，选 α、β≥0 的支路。α 为 Np/m，β 为 rad/m。"
      },
      {
        "id": "electromagnetism-28",
        "title": "良导体趋肤深度",
        "latex": "\\delta=\\sqrt{\\frac{2}{\\omega\\mu\\sigma}}",
        "note": "σ≫ωε 的良导体近似，ω>0；δ 为场幅度衰减到表面 1/e 的深度，功率在同深度衰减为 1/e²。"
      },
      {
        "id": "electromagnetism-29",
        "title": "布儒斯特角",
        "latex": "\\tan\\theta_B=\\frac{n_2}{n_1}",
        "note": "两侧为无损、非磁介质且具有相同 μ，p 偏振由介质 1 入射至 2；θ_B 相对界面法线，n 为折射率。"
      },
      {
        "id": "electromagnetism-30",
        "title": "矩形波导 TE10 截止频率",
        "latex": "f_{c,10}=\\frac{1}{2a\\sqrt{\\mu\\varepsilon}}",
        "note": "理想导体矩形波导，宽边 a 大于窄边 b，内部填满均匀无损介质；TE10 传播需 f>f_c，等号处为截止。"
      }
    ]
  }
];
  if (typeof module === "object" && module.exports) module.exports = groups;
  else root.FormulaDeskExamples = groups;
})(typeof globalThis !== "undefined" ? globalThis : this);
