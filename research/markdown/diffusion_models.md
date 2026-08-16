**Denoising Diffusion Probabilistic Models** 

**Jonathan Ho Ajay Jain Pieter Abbeel** UC Berkeley UC Berkeley UC Berkeley `jonathanho@berkeley.edu ajayj@berkeley.edu pabbeel@cs.berkeley.edu` 

# **Abstract** 

We present high quality image synthesis results using diffusion probabilistic models, a class of latent variable models inspired by considerations from nonequilibrium thermodynamics. Our best results are obtained by training on a weighted variational bound designed according to a novel connection between diffusion probabilistic models and denoising score matching with Langevin dynamics, and our models naturally admit a progressive lossy decompression scheme that can be interpreted as a generalization of autoregressive decoding. On the unconditional CIFAR10 dataset, we obtain an Inception score of 9.46 and a state-of-the-art FID score of 3.17. On 256x256 LSUN, we obtain sample quality similar to ProgressiveGAN. Our implementation is available at `https://github.com/hojonathanho/diffusion` . 

# **1 Introduction** 

Deep generative models of all kinds have recently exhibited high quality samples in a wide variety of data modalities. Generative adversarial networks (GANs), autoregressive models, flows, and variational autoencoders (VAEs) have synthesized striking image and audio samples [14, 27, 3, 58, 38, 25, 10, 32, 44, 57, 26, 33, 45], and there have been remarkable advances in energy-based modeling and score matching that have produced images comparable to those of GANs [11, 55]. 





Figure 1: Generated samples on CelebA-HQ 256 _×_ 256 (left) and unconditional CIFAR10 (right) 

34th Conference on Neural Information Processing Systems (NeurIPS 2020), Vancouver, Canada. 



<!-- Start of picture text -->
p✓ ( x t− 1 | x t )<br>x T −! · · · −! x t −−−−−! x t− 1 −! · · · −! x 0<br>q ( x t| x t− 1)<br>!<br><!-- End of picture text -->

Figure 2: The directed graphical model considered in this work. 

This paper presents progress in diffusion probabilistic models [53]. A diffusion probabilistic model (which we will call a “diffusion model” for brevity) is a parameterized Markov chain trained using variational inference to produce samples matching the data after finite time. Transitions of this chain are learned to reverse a diffusion process, which is a Markov chain that gradually adds noise to the data in the opposite direction of sampling until signal is destroyed. When the diffusion consists of small amounts of Gaussian noise, it is sufficient to set the sampling chain transitions to conditional Gaussians too, allowing for a particularly simple neural network parameterization. 

Diffusion models are straightforward to define and efficient to train, but to the best of our knowledge, there has been no demonstration that they are capable of generating high quality samples. We show that diffusion models actually are capable of generating high quality samples, sometimes better than the published results on other types of generative models (Section 4). In addition, we show that a certain parameterization of diffusion models reveals an equivalence with denoising score matching over multiple noise levels during training and with annealed Langevin dynamics during sampling (Section 3.2) [55, 61]. We obtained our best sample quality results using this parameterization (Section 4.2), so we consider this equivalence to be one of our primary contributions. 

Despite their sample quality, our models do not have competitive log likelihoods compared to other likelihood-based models (our models do, however, have log likelihoods better than the large estimates annealed importance sampling has been reported to produce for energy based models and score matching [11, 55]). We find that the majority of our models’ lossless codelengths are consumed to describe imperceptible image details (Section 4.3). We present a more refined analysis of this phenomenon in the language of lossy compression, and we show that the sampling procedure of diffusion models is a type of progressive decoding that resembles autoregressive decoding along a bit ordering that vastly generalizes what is normally possible with autoregressive models. 

# **2 Background** 

Diffusion models [53] are latent variable models of the form _pθ_ ( **x** 0) := � _pθ_ ( **x** 0: _T_ ) _d_ **x** 1: _T_ , where **x** 1 _, . . . ,_ **x** _T_ are latents of the same dimensionality as the data **x** 0 _∼ q_ ( **x** 0). The joint distribution _pθ_ ( **x** 0: _T_ ) is called the _reverse process_ , and it is defined as a Markov chain with learned Gaussian transitions starting at _p_ ( **x** _T_ ) = _N_ ( **x** _T_ ; **0** _,_ **I** ): 



What distinguishes diffusion models from other types of latent variable models is that the approximate posterior _q_ ( **x** 1: _T |_ **x** 0), called the _forward process_ or _diffusion process_ , is fixed to a Markov chain that gradually adds Gaussian noise to the data according to a variance schedule _β_ 1 _, . . . , βT_ : 



Training is performed by optimizing the usual variational bound on negative log likelihood: 



The forward process variances _βt_ can be learned by reparameterization [33] or held constant as hyperparameters, and expressiveness of the reverse process is ensured in part by the choice of Gaussian conditionals in _pθ_ ( **x** _t−_ 1 _|_ **x** _t_ ), because both processes have the same functional form when _βt_ are small [53]. A notable property of the forward process is that it admits sampling **x** _t_ at an arbitrary timestep _t_ in closed form: using the notation _αt_ := 1 _− βt_ and _α_ ¯ _t_ :=<sup>�</sup><sup>_t_</sup> _s_ =1<sup>_αs_, we have</sup> 



2 

Efficient training is therefore possible by optimizing random terms of _L_ with stochastic gradient descent. Further improvements come from variance reduction by rewriting _L_ (3) as: 



(See Appendix A for details. The labels on the terms are used in Section 3.) Equation (5) uses KL divergence to directly compare _pθ_ ( **x** _t−_ 1 _|_ **x** _t_ ) against forward process posteriors, which are tractable when conditioned on **x** 0: 



Consequently, all KL divergences in Eq. (5) are comparisons between Gaussians, so they can be calculated in a Rao-Blackwellized fashion with closed form expressions instead of high variance Monte Carlo estimates. 

# **3 Diffusion models and denoising autoencoders** 

Diffusion models might appear to be a restricted class of latent variable models, but they allow a large number of degrees of freedom in implementation. One must choose the variances _βt_ of the forward process and the model architecture and Gaussian distribution parameterization of the reverse process. To guide our choices, we establish a new explicit connection between diffusion models and denoising score matching (Section 3.2) that leads to a simplified, weighted variational bound objective for diffusion models (Section 3.4). Ultimately, our model design is justified by simplicity and empirical results (Section 4). Our discussion is categorized by the terms of Eq. (5). 

## **3.1 Forward process and** _LT_ 

We ignore the fact that the forward process variances _βt_ are learnable by reparameterization and instead fix them to constants (see Section 4 for details). Thus, in our implementation, the approximate posterior _q_ has no learnable parameters, so _LT_ is a constant during training and can be ignored. 

## **3.2 Reverse process and** _L_ 1: _T −_ 1 

Now we discuss our choices in _pθ_ ( **x** _t−_ 1 _|_ **x** _t_ ) = _N_ ( **x** _t−_ 1; **_µ_** _θ_ ( **x** _t, t_ ) _,_ **Σ** _θ_ ( **x** _t, t_ )) for 1 _< t ≤ T_ . First, we set **Σ** _θ_ ( **x** _t, t_ ) = _σt_<sup>2</sup><sup>**I**to untrained time dependent constants.Experimentally, both</sup><sup>_σ_</sup> _t_<sup>2=</sup><sup>_βt_and</sup> _σt_<sup>2=</sup><sup>_β_˜</sup><sup>_t_=1</sup><sup>_−_</sup> 1 _−_<sup>_α_¯</sup> _α_<sup>_t_</sup> ¯<sup>_−_</sup> _t_<sup>1</sup><sup>_βt_hadsimilarresults.Thefirstchoiceisoptimalfor</sup><sup>**x**0</sup><sup>_∼N_(</sup><sup>**0**</sup><sup>_,_</sup><sup>**I**),andthe</sup> second is optimal for **x** 0 deterministically set to one point. These are the two extreme choices corresponding to upper and lower bounds on reverse process entropy for data with coordinatewise unit variance [53]. Second, to represent the mean **_µ_** _θ_ ( **x** _t, t_ ), we propose a specific parameterization motivated by the following analysis of _Lt_ . With _pθ_ ( **x** _t−_ 1 _|_ **x** _t_ ) = _N_ ( **x** _t−_ 1; **_µ_** _θ_ ( **x** _t, t_ ) _, σt_<sup>2</sup><sup>**I**), we can write:</sup> 



where _C_ is a constant that does not depend on _θ_ . So, we see that the most straightforward parameterization of **_µ_** _θ_ is a model that predicts **_µ_** ˜ _t_ , the forward process posterior mean. However, we can expand Eq. (8) further by reparameterizing Eq. (4) as **x** _t_ ( **x** 0 _,_ **_ϵ_** ) =<sup>_√_</sup> _<u>α</u>_ <u>¯</u> _t_ **<u>x</u>** 0 +<sup>_√_</sup> 1 _− α_ ¯ _t_ **_ϵ_** for **_ϵ_** _∼N_ ( **0** _,_ **I** ) and applying the forward process posterior formula (7): 



3 

|**Alg **|**orithm 1**Training|**Algorithm 2**Sampling|
|---|---|---|
|1: <br>2:<br>3:<br>4:<br>5:<br>6:|**repeat**<br>**x**0 _∼q_(**x**0)<br>_t ∼_Uniform(_{_1_, . . . , T}_)<br>**_ϵ_**_∼N_(**0**_,_**I**)<br>Take gradient descent step on<br>_∇θ_<br>��**_ϵ_**_−_**_ϵ_**_θ_(_~~√~~_<br>¯_αt_**x**0+ <sup>_~~√~~_</sup><br>1_−_¯_αt_**_ϵ_**_, t_)<br>��2<br>**until**converged|1: **x**_T ∼N_(**0**_,_**I**)<br>2: **for**_t_=_T, . . . ,_1**do**<br>3:<br>**z**_∼N_(**0**_,_**I**)if_t >_1, else**z**=**0**<br>4:<br>**x**_t−_1 =<br>1<br>_~~√~~_<br>_αt_<br>�<br>**x**_t −_<br>1_−αt_<br>_~~√~~_<br>1_−_¯_αt_ <sup>**_ϵ_**</sup><sup>_θ_(</sup><sup>**x**</sup><sup>_t, t_)</sup><br>�<br>+_σt_**z**<br>5: **end for**<br>6: **return x**0|



<u>1</u> _<u>βt</u>_ Equation (10) reveals that **_µ_** _θ_ must predict _~~√~~_ _<u>αt</u>_ � **x** _t −_ _~~√~~_ 1 _−α_ ¯ _t_<sup>**_ϵ_**</sup> � given **x** _t_ . Since **x** _t_ is available as input to the model, we may choose the parameterization 



where **_ϵ_** _θ_ is a function approximator intended to predict **_ϵ_** from **x** _t_ . To sample **x** _t−_ 1 _∼ pθ_ ( **x** _t−_ 1 _|_ **x** _t_ ) is <u>1</u> _<u>βt</u>_ to compute **x** _t−_ 1 = _~~√~~_ _<u>αt</u>_ � **x** _t −_ _~~√~~_ 1 _−α_ ¯ _t_<sup>**_ϵ_**</sup><sup>_θ_(</sup><sup>**x**</sup><sup>_t, t_)</sup> � + _σt_ **z** , where **z** _∼N_ ( **0** _,_ **I** ). The complete sampling procedure, Algorithm 2, resembles Langevin dynamics with **_ϵ_** _θ_ as a learned gradient of the data density. Furthermore, with the parameterization (11), Eq. (10) simplifies to: 



which resembles denoising score matching over multiple noise scales indexed by _t_ [55]. As Eq. (12) is equal to (one term of) the variational bound for the Langevin-like reverse process (11), we see that optimizing an objective resembling denoising score matching is equivalent to using variational inference to fit the finite-time marginal of a sampling chain resembling Langevin dynamics. 

To summarize, we can train the reverse process mean function approximator **_µ_** _θ_ to predict **_µ_** ˜ _t_ , or by modifying its parameterization, we can train it to predict **_ϵ_** . (There is also the possibility of predicting **x** 0, but we found this to lead to worse sample quality early in our experiments.) We have shown that the **_ϵ_** -prediction parameterization both resembles Langevin dynamics and simplifies the diffusion model’s variational bound to an objective that resembles denoising score matching. Nonetheless, it is just another parameterization of _pθ_ ( **x** _t−_ 1 _|_ **x** _t_ ), so we verify its effectiveness in Section 4 in an ablation where we compare predicting **_ϵ_** against predicting **_µ_** ˜ _t_ . 

## **3.3 Data scaling, reverse process decoder, and** _L_ 0 

We assume that image data consists of integers in _{_ 0 _,_ 1 _, . . . ,_ 255 _}_ scaled linearly to [ _−_ 1 _,_ 1]. This ensures that the neural network reverse process operates on consistently scaled inputs starting from the standard normal prior _p_ ( **x** _T_ ). To obtain discrete log likelihoods, we set the last term of the reverse process to an independent discrete decoder derived from the Gaussian _N_ ( **x** 0; **_µ_** _θ_ ( **x** 1 _,_ 1) _, σ_ 1<sup>2</sup><sup>**I**):</sup> 



where _D_ is the data dimensionality and the _i_ superscript indicates extraction of one coordinate. (It would be straightforward to instead incorporate a more powerful decoder like a conditional autoregressive model, but we leave that to future work.) Similar to the discretized continuous distributions used in VAE decoders and autoregressive models [34, 52], our choice here ensures that the variational bound is a lossless codelength of discrete data, without need of adding noise to the data or incorporating the Jacobian of the scaling operation into the log likelihood. At the end of sampling, we display **_µ_** _θ_ ( **x** 1 _,_ 1) noiselessly. 

## **3.4 Simplified training objective** 

With the reverse process and decoder defined above, the variational bound, consisting of terms derived from Eqs. (12) and (13), is clearly differentiable with respect to _θ_ and is ready to be employed for 

4 

Table 1: CIFAR10 results. NLL measured in bits/dim. 

|Model<br>**Conditional**|IS|FID|NLL Test (Train)|~~T~~able 2: Unconditio<br>process parameterizati|nal CIFAR10 <br>on and trainin|reverse<br>g objec-|
|---|---|---|---|---|---|---|
|EBM [11]|8_._30|37_._9||tive ablation. Blank en|tries were uns|table to|
|JEM [17]<br>BigGAN [3]|8_._76<br>9_._22|38_._4<br>14_._73||train and generated poo<br>|r samples wit|h out-of-|
|StyleGAN2 + ADA (v1) [29]|**10**_._**06**|**2**_._**67**||range scores.|||
|**Unconditional**||||Objective|IS|FID|
|Diffusion (original) [53]|||_≤_5_._40|˜**_µ_ prediction (baseline)**|||
|Gated PixelCNN [59]|4_._60|65_._93|3_._03 (2_._90)|_L_, learned diagonal**Σ**|7_._28_±_0_._10|23_._69|
|Sparse Transformer [7]|||**2**_._**80**|_L_, fixed isotropic**Σ**|8_._06_±_0_._09|13_._22|
|PixelIQN [43]|5_._29|49_._46||_∥_˜**_µ_**_−_˜**_µ_**_θ∥_<sup>2</sup>|–|–|
|EBM [11]|6_._78|38_._2|||||
|NCSNv2 [56]||31_._75||**_ϵ_ prediction (ours)**|||
|NCSN [55]<br>SNGAN [39]<br>SNGAN-DDLS [4]|8_._87_±_0_._12<br>8_._22_±_0_._05<br>9_._09_±_0_._10|25_._32<br>21_._7<br>15_._42||_L_, learned diagonal**Σ**<br>_L_, fixed isotropic**Σ**<br>˜<sup>2 </sup>|–<br>7_._67_±_0_._13<br>|–<br>13_._51<br>|
|StyleGAN2 + ADA (v1) [29]|**9**_._**74**_±_0_._05|3_._26||_∥_**_ϵ_**_−_**_ϵ_**_θ∥_ (_L_simple)|**9**_._**46**_±_**0**_._**11**|**3**_._**17**|
|Ours (_L_, fixed isotropic**Σ**)|7_._67_±_0_._13|13_._51|_≤_3_._70 (3_._69)||||
|**Ours (**_L_simple**)**|9_._46_±_0_._11|**3**_._**17**|_≤_3_._75 (3_._72)||||



training. However, we found it beneficial to sample quality (and simpler to implement) to train on the following variant of the variational bound: 



where _t_ is uniform between 1 and _T_ . The _t_ = 1 case corresponds to _L_ 0 with the integral in the discrete decoder definition (13) approximated by the Gaussian probability density function times the bin width, ignoring _σ_ 1<sup>2and edge effects.The</sup><sup>_t>_1 cases correspond to an unweighted version of</sup> Eq. (12), analogous to the loss weighting used by the NCSN denoising score matching model [55]. ( _LT_ does not appear because the forward process variances _βt_ are fixed.) Algorithm 1 displays the complete training procedure with this simplified objective. 

Since our simplified objective (14) discards the weighting in Eq. (12), it is a weighted variational bound that emphasizes different aspects of reconstruction compared to the standard variational bound [18, 22]. In particular, our diffusion process setup in Section 4 causes the simplified objective to down-weight loss terms corresponding to small _t_ . These terms train the network to denoise data with very small amounts of noise, so it is beneficial to down-weight them so that the network can focus on more difficult denoising tasks at larger _t_ terms. We will see in our experiments that this reweighting leads to better sample quality. 

# **4 Experiments** 

We set _T_ = 1000 for all experiments so that the number of neural network evaluations needed during sampling matches previous work [53, 55]. We set the forward process variances to constants increasing linearly from _β_ 1 = 10<sup>_−_4</sup> to _βT_ = 0 _._ 02. These constants were chosen to be small relative to data scaled to [ _−_ 1 _,_ 1], ensuring that reverse and forward processes have approximately the same functional form while keeping the signal-to-noise ratio at **x** _T_ as small as possible ( _LT_ = _D_ KL( _q_ ( **x** _T |_ **x** 0) _∥N_ ( **0** _,_ **I** )) _≈_ 10<sup>_−_5</sup> bits per dimension in our experiments). 

To represent the reverse process, we use a U-Net backbone similar to an unmasked PixelCNN++ [52, 48] with group normalization throughout [66]. Parameters are shared across time, which is specified to the network using the Transformer sinusoidal position embedding [60]. We use self-attention at the 16 _×_ 16 feature map resolution [63, 60]. Details are in Appendix B. 

## **4.1 Sample quality** 

Table 1 shows Inception scores, FID scores, and negative log likelihoods (lossless codelengths) on CIFAR10. With our FID score of 3.17, our unconditional model achieves better sample quality than most models in the literature, including class conditional models. Our FID score is computed with respect to the training set, as is standard practice; when we compute it with respect to the test set, the score is 5.24, which is still better than many of the training set FID scores in the literature. 

5 



Figure 3: LSUN Church samples. FID=7 _._ 89 



Figure 4: LSUN Bedroom samples. FID=4 _._ 90 

|**Algorithm 3**Sending**x**0|**Algorithm 4**Receiving|
|---|---|
|1: Send**x**_T ∼q_(**x**_T |_**x**0)using_p_(**x**_T_)|1: Receive**x**_T_ using_p_(**x**_T_)|
|2: **for**_t_=_T −_1_, . . . ,_2_,_1**do**|2: **for**_t_=_T −_1_, . . . ,_1_,_0**do**|
|3:<br>Send**x**_t ∼q_(**x**_t|_**x**_t_+1_,_**x**0)using_pθ_(**x**_t|_**x**_t_+1)|3:<br>Receive**x**_t_ using_pθ_(**x**_t|_**x**_t_+1)|
|4: **end for**|4: **end for**|
|5: Send**x**0 using_pθ_(**x**0_|_**x**1)|5: **return x**0|



We find that training our models on the true variational bound yields better codelengths than training on the simplified objective, as expected, but the latter yields the best sample quality. See Fig. 1 for CIFAR10 and CelebA-HQ 256 _×_ 256 samples, Fig. 3 and Fig. 4 for LSUN 256 _×_ 256 samples [71], and Appendix D for more. 

## **4.2 Reverse process parameterization and training objective ablation** 

In Table 2, we show the sample quality effects of reverse process parameterizations and training objectives (Section 3.2). We find that the baseline option of predicting **_µ_** ˜ works well only when trained on the true variational bound instead of unweighted mean squared error, a simplified objective akin to Eq. (14). We also see that learning reverse process variances (by incorporating a parameterized diagonal **Σ** _θ_ ( **x** _t_ ) into the variational bound) leads to unstable training and poorer sample quality compared to fixed variances. Predicting **_ϵ_** , as we proposed, performs approximately as well as predicting **_µ_** ˜ when trained on the variational bound with fixed variances, but much better when trained with our simplified objective. 

## **4.3 Progressive coding** 

Table 1 also shows the codelengths of our CIFAR10 models. The gap between train and test is at most 0.03 bits per dimension, which is comparable to the gaps reported with other likelihood-based models and indicates that our diffusion model is not overfitting (see Appendix D for nearest neighbor visualizations). Still, while our lossless codelengths are better than the large estimates reported for energy based models and score matching using annealed importance sampling [11], they are not competitive with other types of likelihood-based generative models [7]. 

Since our samples are nonetheless of high quality, we conclude that diffusion models have an inductive bias that makes them excellent lossy compressors. Treating the variational bound terms _L_ 1 + _· · ·_ + _LT_ as rate and _L_ 0 as distortion, our CIFAR10 model with the highest quality samples has a rate of **1.78** bits/dim and a distortion of **1.97** bits/dim, which amounts to a root mean squared error of 0.95 on a scale from 0 to 255. More than half of the lossless codelength describes imperceptible distortions. 

**Progressive lossy compression** We can probe further into the rate-distortion behavior of our model by introducing a progressive lossy code that mirrors the form of Eq. (5): see Algorithms 3 and 4, which assume access to a procedure, such as minimal random coding [19, 20], that can transmit a sample **x** _∼ q_ ( **x** ) using approximately _D_ KL( _q_ ( **x** ) _∥ p_ ( **x** )) bits on average for any distributions _p_ and _q_ , for which only _p_ is available to the receiver beforehand. When applied to **x** 0 _∼ q_ ( **x** 0), Algorithms 3 and 4 transmit **x** _T , . . . ,_ **x** 0 in sequence using a total expected codelength equal to Eq. (5). The receiver, 

6 

at any time _t_ , has the partial information **x** _t_ fully available and can progressively estimate: 



due to Eq. (4). (A stochastic reconstruction **x** 0 _∼ pθ_ ( **x** 0 _|_ **x** _t_ ) is also valid, but we do not consider it here because it makes distortion more difficult to evaluate.) Figure 5 shows the resulting ratedistortion plot on the CIFAR10 test set. At each time _t_ , the distortion is calculated as the root mean squared error � _∥_ **x** 0 _−_ **x** ˆ0 _∥_<sup>2</sup> _/D_ , and the rate is calculated as the cumulative number of bits received so far at time _t_ . The distortion decreases steeply in the low-rate region of the rate-distortion plot, indicating that the majority of the bits are indeed allocated to imperceptible distortions. 



<!-- Start of picture text -->
80 1 . 5 80<br>60 60<br>1<br>40 40<br>0 . 5<br>20 20<br>0 0 0<br>0 200 400 600 800 1 , 000 0 200 400 600 800 1 , 000 0 0 . 5 1 1 . 5<br>Reverse process steps ( T − t ) Reverse process steps ( T − t ) Rate (bits/dim)<br>Rate (bits/dim)<br>Distortion (RMSE) Distortion (RMSE)<br><!-- End of picture text -->

Figure 5: Unconditional CIFAR10 test set rate-distortion vs. time. Distortion is measured in root mean squared error on a [0 _,_ 255] scale. See Table 4 for details. 

**Progressive generation** We also run a progressive unconditional generation process given by progressive decompression from random bits. In other words, we predict the result of the reverse process, **x** ˆ0, while sampling from the reverse process using Algorithm 2. Figures 6 and 10 show the resulting sample quality of **x** ˆ0 over the course of the reverse process. Large scale image features appear first and details appear last. Figure 7 shows stochastic predictions **x** 0 _∼ pθ_ ( **x** 0 _|_ **x** _t_ ) with **x** _t_ frozen for various _t_ . When _t_ is small, all but fine details are preserved, and when _t_ is large, only large scale features are preserved. Perhaps these are hints of conceptual compression [18]. 



Figure 6: Unconditional CIFAR10 progressive generation ( **x** ˆ0 over time, from left to right). Extended samples and sample quality metrics over time in the appendix (Figs. 10 and 14). 



Figure 7: When conditioned on the same latent, CelebA-HQ 256 _×_ 256 samples share high-level attributes. Bottom-right quadrants are **x** _t_ , and other quadrants are samples from _pθ_ ( **x** 0 _|_ **x** _t_ ). 

**Connection to autoregressive decoding** Note that the variational bound (5) can be rewritten as: 



(See Appendix A for a derivation.) Now consider setting the diffusion process length _T_ to the dimensionality of the data, defining the forward process so that _q_ ( **x** _t|_ **x** 0) places all probability mass on **x** 0 with the first _t_ coordinates masked out (i.e. _q_ ( **x** _t|_ **x** _t−_ 1) masks out the _t_<sup>th</sup> coordinate), setting _p_ ( **x** _T_ ) to place all mass on a blank image, and, for the sake of argument, taking _pθ_ ( **x** _t−_ 1 _|_ **x** _t_ ) to 

7 



Figure 8: Interpolations of CelebA-HQ 256x256 images with 500 timesteps of diffusion. 

be a fully expressive conditional distribution. With these choices, _D_ KL( _q_ ( **x** _T_ ) _∥ p_ ( **x** _T_ )) = 0, and minimizing _D_ KL( _q_ ( **x** _t−_ 1 _|_ **x** _t_ ) _∥ pθ_ ( **x** _t−_ 1 _|_ **x** _t_ )) trains _pθ_ to copy coordinates _t_ + 1 _, . . . , T_ unchanged and to predict the _t_<sup>th</sup> coordinate given _t_ + 1 _, . . . , T_ . Thus, training _pθ_ with this particular diffusion is training an autoregressive model. 

We can therefore interpret the Gaussian diffusion model (2) as a kind of autoregressive model with a generalized bit ordering that cannot be expressed by reordering data coordinates. Prior work has shown that such reorderings introduce inductive biases that have an impact on sample quality [38], so we speculate that the Gaussian diffusion serves a similar purpose, perhaps to greater effect since Gaussian noise might be more natural to add to images compared to masking noise. Moreover, the Gaussian diffusion length is not restricted to equal the data dimension; for instance, we use _T_ = 1000, which is less than the dimension of the 32 _×_ 32 _×_ 3 or 256 _×_ 256 _×_ 3 images in our experiments. Gaussian diffusions can be made shorter for fast sampling or longer for model expressiveness. 

## **4.4 Interpolation** 

We can interpolate source images **x** 0 _,_ **x**<sup>_′_</sup> 0<sup>_∼q_(</sup><sup>**x**0) in latent space using</sup><sup>_q_as a stochastic encoder,</sup> **x** _t,_ **x**<sup>_′_</sup> _t_<sup>_∼q_(</sup><sup>**x**</sup><sup>_t|_</sup><sup>**x**0), then decoding the linearly interpolated latent</sup><sup>**x**¯</sup><sup>_t_= (1</sup><sup>_−λ_)</sup><sup>**x**0+</sup><sup>_λ_</sup><sup>**x**</sup><sup>_′_</sup> 0<sup>into image</sup> space by the reverse process, **x** ¯0 _∼ p_ ( **x** 0 _|_ **x** ¯ _t_ ). In effect, we use the reverse process to remove artifacts from linearly interpolating corrupted versions of the source images, as depicted in Fig. 8 (left). We fixed the noise for different values of _λ_ so **x** _t_ and **x**<sup>_′_</sup> _t_<sup>remainthesame.Fig.8(right)</sup> shows interpolations and reconstructions of original CelebA-HQ 256 _×_ 256 images ( _t_ = 500). The reverse process produces high-quality reconstructions, and plausible interpolations that smoothly vary attributes such as pose, skin tone, hairstyle, expression and background, but not eyewear. Larger _t_ results in coarser and more varied interpolations, with novel samples at _t_ = 1000 (Appendix Fig. 9). 

# **5 Related Work** 

While diffusion models might resemble flows [9, 46, 10, 32, 5, 16, 23] and VAEs [33, 47, 37], diffusion models are designed so that _q_ has no parameters and the top-level latent **x** _T_ has nearly zero mutual information with the data **x** 0. Our **_ϵ_** -prediction reverse process parameterization establishes a connection between diffusion models and denoising score matching over multiple noise levels with annealed Langevin dynamics for sampling [55, 56]. Diffusion models, however, admit straightforward log likelihood evaluation, and the training procedure explicitly trains the Langevin dynamics sampler using variational inference (see Appendix C for details). The connection also has the reverse implication that a certain weighted form of denoising score matching is the same as variational inference to train a Langevin-like sampler. Other methods for learning transition operators of Markov chains include infusion training [2], variational walkback [15], generative stochastic networks [1], and others [50, 54, 36, 42, 35, 65]. 

By the known connection between score matching and energy-based modeling, our work could have implications for other recent work on energy-based models [67–69, 12, 70, 13, 11, 41, 17, 8]. Our rate-distortion curves are computed over time in one evaluation of the variational bound, reminiscent of how rate-distortion curves can be computed over distortion penalties in one run of annealed importance sampling [24]. Our progressive decoding argument can be seen in convolutional DRAW and related models [18, 40] and may also lead to more general designs for subscale orderings or sampling strategies for autoregressive models [38, 64]. 

8 

# **6 Conclusion** 

We have presented high quality image samples using diffusion models, and we have found connections among diffusion models and variational inference for training Markov chains, denoising score matching and annealed Langevin dynamics (and energy-based models by extension), autoregressive models, and progressive lossy compression. Since diffusion models seem to have excellent inductive biases for image data, we look forward to investigating their utility in other data modalities and as components in other types of generative models and machine learning systems. 

# **Broader Impact** 

Our work on diffusion models takes on a similar scope as existing work on other types of deep generative models, such as efforts to improve the sample quality of GANs, flows, autoregressive models, and so forth. Our paper represents progress in making diffusion models a generally useful tool in this family of techniques, so it may serve to amplify any impacts that generative models have had (and will have) on the broader world. 

Unfortunately, there are numerous well-known malicious uses of generative models. Sample generation techniques can be employed to produce fake images and videos of high profile figures for political purposes. While fake images were manually created long before software tools were available, generative models such as ours make the process easier. Fortunately, CNN-generated images currently have subtle flaws that allow detection [62], but improvements in generative models may make this more difficult. Generative models also reflect the biases in the datasets on which they are trained. As many large datasets are collected from the internet by automated systems, it can be difficult to remove these biases, especially when the images are unlabeled. If samples from generative models trained on these datasets proliferate throughout the internet, then these biases will only be reinforced further. 

On the other hand, diffusion models may be useful for data compression, which, as data becomes higher resolution and as global internet traffic increases, might be crucial to ensure accessibility of the internet to wide audiences. Our work might contribute to representation learning on unlabeled raw data for a large range of downstream tasks, from image classification to reinforcement learning, and diffusion models might also become viable for creative uses in art, photography, and music. 

# **Acknowledgments and Disclosure of Funding** 

This work was supported by ONR PECASE and the NSF Graduate Research Fellowship under grant number DGE-1752814. Google’s TensorFlow Research Cloud (TFRC) provided Cloud TPUs. 

# **References** 

- [1] Guillaume Alain, Yoshua Bengio, Li Yao, Jason Yosinski, Eric Thibodeau-Laufer, Saizheng Zhang, and Pascal Vincent. GSNs: generative stochastic networks. _Information and Inference: A Journal of the IMA_ , 5(2):210–249, 2016. 

- [2] Florian Bordes, Sina Honari, and Pascal Vincent. Learning to generate samples from noise through infusion training. In _International Conference on Learning Representations_ , 2017. 

- [3] Andrew Brock, Jeff Donahue, and Karen Simonyan. Large scale GAN training for high fidelity natural image synthesis. In _International Conference on Learning Representations_ , 2019. 

- [4] Tong Che, Ruixiang Zhang, Jascha Sohl-Dickstein, Hugo Larochelle, Liam Paull, Yuan Cao, and Yoshua Bengio. Your GAN is secretly an energy-based model and you should use discriminator driven latent sampling. _arXiv preprint arXiv:2003.06060_ , 2020. 

- [5] Tian Qi Chen, Yulia Rubanova, Jesse Bettencourt, and David K Duvenaud. Neural ordinary differential equations. In _Advances in Neural Information Processing Systems_ , pages 6571–6583, 2018. 

- [6] Xi Chen, Nikhil Mishra, Mostafa Rohaninejad, and Pieter Abbeel. PixelSNAIL: An improved autoregressive generative model. In _International Conference on Machine Learning_ , pages 863–871, 2018. 

- [7] Rewon Child, Scott Gray, Alec Radford, and Ilya Sutskever. Generating long sequences with sparse transformers. _arXiv preprint arXiv:1904.10509_ , 2019. 

9 

- [8] Yuntian Deng, Anton Bakhtin, Myle Ott, Arthur Szlam, and Marc’Aurelio Ranzato. Residual energy-based models for text generation. _arXiv preprint arXiv:2004.11714_ , 2020. 

- [9] Laurent Dinh, David Krueger, and Yoshua Bengio. NICE: Non-linear independent components estimation. _arXiv preprint arXiv:1410.8516_ , 2014. 

- [10] Laurent Dinh, Jascha Sohl-Dickstein, and Samy Bengio. Density estimation using Real NVP. _arXiv preprint arXiv:1605.08803_ , 2016. 

- [11] Yilun Du and Igor Mordatch. Implicit generation and modeling with energy based models. In _Advances in Neural Information Processing Systems_ , pages 3603–3613, 2019. 

- [12] Ruiqi Gao, Yang Lu, Junpei Zhou, Song-Chun Zhu, and Ying Nian Wu. Learning generative ConvNets via multi-grid modeling and sampling. In _Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition_ , pages 9155–9164, 2018. 

- [13] Ruiqi Gao, Erik Nijkamp, Diederik P Kingma, Zhen Xu, Andrew M Dai, and Ying Nian Wu. Flow contrastive estimation of energy-based models. In _Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition_ , pages 7518–7528, 2020. 

- [14] Ian Goodfellow, Jean Pouget-Abadie, Mehdi Mirza, Bing Xu, David Warde-Farley, Sherjil Ozair, Aaron Courville, and Yoshua Bengio. Generative adversarial nets. In _Advances in Neural Information Processing Systems_ , pages 2672–2680, 2014. 

- [15] Anirudh Goyal, Nan Rosemary Ke, Surya Ganguli, and Yoshua Bengio. Variational walkback: Learning a transition operator as a stochastic recurrent net. In _Advances in Neural Information Processing Systems_ , pages 4392–4402, 2017. 

- [16] Will Grathwohl, Ricky T. Q. Chen, Jesse Bettencourt, and David Duvenaud. FFJORD: Free-form continuous dynamics for scalable reversible generative models. In _International Conference on Learning Representations_ , 2019. 

- [17] Will Grathwohl, Kuan-Chieh Wang, Joern-Henrik Jacobsen, David Duvenaud, Mohammad Norouzi, and Kevin Swersky. Your classifier is secretly an energy based model and you should treat it like one. In _International Conference on Learning Representations_ , 2020. 

- [18] Karol Gregor, Frederic Besse, Danilo Jimenez Rezende, Ivo Danihelka, and Daan Wierstra. Towards conceptual compression. In _Advances In Neural Information Processing Systems_ , pages 3549–3557, 2016. 

- [19] Prahladh Harsha, Rahul Jain, David McAllester, and Jaikumar Radhakrishnan. The communication complexity of correlation. In _Twenty-Second Annual IEEE Conference on Computational Complexity (CCC’07)_ , pages 10–23. IEEE, 2007. 

- [20] Marton Havasi, Robert Peharz, and José Miguel Hernández-Lobato. Minimal random code learning: Getting bits back from compressed model parameters. In _International Conference on Learning Representations_ , 2019. 

- [21] Martin Heusel, Hubert Ramsauer, Thomas Unterthiner, Bernhard Nessler, and Sepp Hochreiter. GANs trained by a two time-scale update rule converge to a local Nash equilibrium. In _Advances in Neural Information Processing Systems_ , pages 6626–6637, 2017. 

- [22] Irina Higgins, Loic Matthey, Arka Pal, Christopher Burgess, Xavier Glorot, Matthew Botvinick, Shakir Mohamed, and Alexander Lerchner. beta-VAE: Learning basic visual concepts with a constrained variational framework. In _International Conference on Learning Representations_ , 2017. 

- [23] Jonathan Ho, Xi Chen, Aravind Srinivas, Yan Duan, and Pieter Abbeel. Flow++: Improving flow-based generative models with variational dequantization and architecture design. In _International Conference on Machine Learning_ , 2019. 

- [24] Sicong Huang, Alireza Makhzani, Yanshuai Cao, and Roger Grosse. Evaluating lossy compression rates of deep generative models. In _International Conference on Machine Learning_ , 2020. 

- [25] Nal Kalchbrenner, Aaron van den Oord, Karen Simonyan, Ivo Danihelka, Oriol Vinyals, Alex Graves, and Koray Kavukcuoglu. Video pixel networks. In _International Conference on Machine Learning_ , pages 1771–1779, 2017. 

- [26] Nal Kalchbrenner, Erich Elsen, Karen Simonyan, Seb Noury, Norman Casagrande, Edward Lockhart, Florian Stimberg, Aaron van den Oord, Sander Dieleman, and Koray Kavukcuoglu. Efficient neural audio synthesis. In _International Conference on Machine Learning_ , pages 2410–2419, 2018. 

- [27] Tero Karras, Timo Aila, Samuli Laine, and Jaakko Lehtinen. Progressive growing of GANs for improved quality, stability, and variation. In _International Conference on Learning Representations_ , 2018. 

- [28] Tero Karras, Samuli Laine, and Timo Aila. A style-based generator architecture for generative adversarial networks. In _Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition_ , pages 

10 

4401–4410, 2019. 

- [29] Tero Karras, Miika Aittala, Janne Hellsten, Samuli Laine, Jaakko Lehtinen, and Timo Aila. Training generative adversarial networks with limited data. _arXiv preprint arXiv:2006.06676v1_ , 2020. 

- [30] Tero Karras, Samuli Laine, Miika Aittala, Janne Hellsten, Jaakko Lehtinen, and Timo Aila. Analyzing and improving the image quality of StyleGAN. In _Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition_ , pages 8110–8119, 2020. 

- [31] Diederik P Kingma and Jimmy Ba. Adam: A method for stochastic optimization. In _International Conference on Learning Representations_ , 2015. 

- [32] Diederik P Kingma and Prafulla Dhariwal. Glow: Generative flow with invertible 1x1 convolutions. In _Advances in Neural Information Processing Systems_ , pages 10215–10224, 2018. 

- [33] Diederik P Kingma and Max Welling. Auto-encoding variational Bayes. _arXiv preprint arXiv:1312.6114_ , 2013. 

- [34] Diederik P Kingma, Tim Salimans, Rafal Jozefowicz, Xi Chen, Ilya Sutskever, and Max Welling. Improved variational inference with inverse autoregressive flow. In _Advances in Neural Information Processing Systems_ , pages 4743–4751, 2016. 

- [35] John Lawson, George Tucker, Bo Dai, and Rajesh Ranganath. Energy-inspired models: Learning with sampler-induced distributions. In _Advances in Neural Information Processing Systems_ , pages 8501–8513, 2019. 

- [36] Daniel Levy, Matt D. Hoffman, and Jascha Sohl-Dickstein. Generalizing Hamiltonian Monte Carlo with neural networks. In _International Conference on Learning Representations_ , 2018. 

- [37] Lars Maaløe, Marco Fraccaro, Valentin Liévin, and Ole Winther. BIVA: A very deep hierarchy of latent variables for generative modeling. In _Advances in Neural Information Processing Systems_ , pages 6548–6558, 2019. 

- [38] Jacob Menick and Nal Kalchbrenner. Generating high fidelity images with subscale pixel networks and multidimensional upscaling. In _International Conference on Learning Representations_ , 2019. 

- [39] Takeru Miyato, Toshiki Kataoka, Masanori Koyama, and Yuichi Yoshida. Spectral normalization for generative adversarial networks. In _International Conference on Learning Representations_ , 2018. 

- [40] Alex Nichol. VQ-DRAW: A sequential discrete VAE. _arXiv preprint arXiv:2003.01599_ , 2020. 

- [41] Erik Nijkamp, Mitch Hill, Tian Han, Song-Chun Zhu, and Ying Nian Wu. On the anatomy of MCMC-based maximum likelihood learning of energy-based models. _arXiv preprint arXiv:1903.12370_ , 2019. 

- [42] Erik Nijkamp, Mitch Hill, Song-Chun Zhu, and Ying Nian Wu. Learning non-convergent non-persistent short-run MCMC toward energy-based model. In _Advances in Neural Information Processing Systems_ , pages 5233–5243, 2019. 

- [43] Georg Ostrovski, Will Dabney, and Remi Munos. Autoregressive quantile networks for generative modeling. In _International Conference on Machine Learning_ , pages 3936–3945, 2018. 

- [44] Ryan Prenger, Rafael Valle, and Bryan Catanzaro. WaveGlow: A flow-based generative network for speech synthesis. In _ICASSP 2019-2019 IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP)_ , pages 3617–3621. IEEE, 2019. 

- [45] Ali Razavi, Aaron van den Oord, and Oriol Vinyals. Generating diverse high-fidelity images with VQVAE-2. In _Advances in Neural Information Processing Systems_ , pages 14837–14847, 2019. 

- [46] Danilo Rezende and Shakir Mohamed. Variational inference with normalizing flows. In _International Conference on Machine Learning_ , pages 1530–1538, 2015. 

- [47] Danilo Jimenez Rezende, Shakir Mohamed, and Daan Wierstra. Stochastic backpropagation and approximate inference in deep generative models. In _International Conference on Machine Learning_ , pages 1278–1286, 2014. 

- [48] Olaf Ronneberger, Philipp Fischer, and Thomas Brox. U-Net: Convolutional networks for biomedical image segmentation. In _International Conference on Medical Image Computing and Computer-Assisted Intervention_ , pages 234–241. Springer, 2015. 

- [49] Tim Salimans and Durk P Kingma. Weight normalization: A simple reparameterization to accelerate training of deep neural networks. In _Advances in Neural Information Processing Systems_ , pages 901–909, 2016. 

- [50] Tim Salimans, Diederik Kingma, and Max Welling. Markov Chain Monte Carlo and variational inference: Bridging the gap. In _International Conference on Machine Learning_ , pages 1218–1226, 2015. 

11 

- [51] Tim Salimans, Ian Goodfellow, Wojciech Zaremba, Vicki Cheung, Alec Radford, and Xi Chen. Improved techniques for training gans. In _Advances in Neural Information Processing Systems_ , pages 2234–2242, 2016. 

- [52] Tim Salimans, Andrej Karpathy, Xi Chen, and Diederik P Kingma. PixelCNN++: Improving the PixelCNN with discretized logistic mixture likelihood and other modifications. In _International Conference on Learning Representations_ , 2017. 

- [53] Jascha Sohl-Dickstein, Eric Weiss, Niru Maheswaranathan, and Surya Ganguli. Deep unsupervised learning using nonequilibrium thermodynamics. In _International Conference on Machine Learning_ , pages 2256–2265, 2015. 

- [54] Jiaming Song, Shengjia Zhao, and Stefano Ermon. A-NICE-MC: Adversarial training for MCMC. In _Advances in Neural Information Processing Systems_ , pages 5140–5150, 2017. 

- [55] Yang Song and Stefano Ermon. Generative modeling by estimating gradients of the data distribution. In _Advances in Neural Information Processing Systems_ , pages 11895–11907, 2019. 

- [56] Yang Song and Stefano Ermon. Improved techniques for training score-based generative models. _arXiv preprint arXiv:2006.09011_ , 2020. 

- [57] Aaron van den Oord, Sander Dieleman, Heiga Zen, Karen Simonyan, Oriol Vinyals, Alex Graves, Nal Kalchbrenner, Andrew Senior, and Koray Kavukcuoglu. WaveNet: A generative model for raw audio. _arXiv preprint arXiv:1609.03499_ , 2016. 

- [58] Aaron van den Oord, Nal Kalchbrenner, and Koray Kavukcuoglu. Pixel recurrent neural networks. _International Conference on Machine Learning_ , 2016. 

- [59] Aaron van den Oord, Nal Kalchbrenner, Oriol Vinyals, Lasse Espeholt, Alex Graves, and Koray Kavukcuoglu. Conditional image generation with PixelCNN decoders. In _Advances in Neural Information Processing Systems_ , pages 4790–4798, 2016. 

- [60] Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N Gomez, Łukasz Kaiser, and Illia Polosukhin. Attention is all you need. In _Advances in Neural Information Processing Systems_ , pages 5998–6008, 2017. 

- [61] Pascal Vincent. A connection between score matching and denoising autoencoders. _Neural Computation_ , 23(7):1661–1674, 2011. 

- [62] Sheng-Yu Wang, Oliver Wang, Richard Zhang, Andrew Owens, and Alexei A Efros. Cnn-generated images are surprisingly easy to spot...for now. In _Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition_ , 2020. 

- [63] Xiaolong Wang, Ross Girshick, Abhinav Gupta, and Kaiming He. Non-local neural networks. In _Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition_ , pages 7794–7803, 2018. 

- [64] Auke J Wiggers and Emiel Hoogeboom. Predictive sampling with forecasting autoregressive models. _arXiv preprint arXiv:2002.09928_ , 2020. 

- [65] Hao Wu, Jonas Köhler, and Frank Noé. Stochastic normalizing flows. _arXiv preprint arXiv:2002.06707_ , 2020. 

- [66] Yuxin Wu and Kaiming He. Group normalization. In _Proceedings of the European Conference on Computer Vision (ECCV)_ , pages 3–19, 2018. 

- [67] Jianwen Xie, Yang Lu, Song-Chun Zhu, and Yingnian Wu. A theory of generative convnet. In _International Conference on Machine Learning_ , pages 2635–2644, 2016. 

- [68] Jianwen Xie, Song-Chun Zhu, and Ying Nian Wu. Synthesizing dynamic patterns by spatial-temporal generative convnet. In _Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition_ , pages 7093–7101, 2017. 

- [69] Jianwen Xie, Zilong Zheng, Ruiqi Gao, Wenguan Wang, Song-Chun Zhu, and Ying Nian Wu. Learning descriptor networks for 3d shape synthesis and analysis. In _Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition_ , pages 8629–8638, 2018. 

- [70] Jianwen Xie, Song-Chun Zhu, and Ying Nian Wu. Learning energy-based spatial-temporal generative convnets for dynamic patterns. _IEEE Transactions on Pattern Analysis and Machine Intelligence_ , 2019. 

- [71] Fisher Yu, Yinda Zhang, Shuran Song, Ari Seff, and Jianxiong Xiao. LSUN: Construction of a large-scale image dataset using deep learning with humans in the loop. _arXiv preprint arXiv:1506.03365_ , 2015. 

- [72] Sergey Zagoruyko and Nikos Komodakis. Wide residual networks. _arXiv preprint arXiv:1605.07146_ , 2016. 

12 

# **Extra information** 

**LSUN** FID scores for LSUN datasets are included in Table 3. Scores marked with<sup>_∗_</sup> are reported by StyleGAN2 as baselines, and other scores are reported by their respective authors. 

Table 3: FID scores for LSUN 256 _×_ 256 datasets 

|Model|LSUN Bedroom|LSUN Church|LSUN Cat|
|---|---|---|---|
|ProgressiveGAN [27]|8.34|6.42|37.52|
|StyleGAN [28]|**2.65**|4.21<sup>_∗_</sup>|8.53<sup>_∗_</sup>|
|StyleGAN2 [30]|-|**3.86**|**6.93**|
|Ours (_L_simple)|6.36|7.89|19.75|
|Ours (_L_simple, large)|4.90|-|-|



**Progressive compression** Our lossy compression argument in Section 4.3 is only a proof of concept, because Algorithms 3 and 4 depend on a procedure such as minimal random coding [20], which is not tractable for high dimensional data. These algorithms serve as a compression interpretation of the variational bound (5) of Sohl-Dickstein et al. [53], not yet as a practical compression system. 

Table 4: Unconditional CIFAR10 test set rate-distortion values (accompanies Fig. 5) 

|Reverse process time (_T −t_+ 1)|Rate (bits/dim)|Distortion (RMSE[0_,_255])|
|---|---|---|
|1000|1.77581|0.95136|
|900|0.11994|12.02277|
|800|0.05415|18.47482|
|700|0.02866|24.43656|
|600|0.01507|30.80948|
|500|0.00716|38.03236|
|400|0.00282|46.12765|
|300|0.00081|54.18826|
|200|0.00013|60.97170|
|100|0.00000|67.60125|



# **A Extended derivations** 

Below is a derivation of Eq. (5), the reduced variance variational bound for diffusion models. This material is from Sohl-Dickstein et al. [53]; we include it here only for completeness. 



13 



The following is an alternate version of _L_ . It is not tractable to estimate, but it is useful for our discussion in Section 4.3. 



# **B Experimental details** 

Our neural network architecture follows the backbone of PixelCNN++ [52], which is a U-Net [48] based on a Wide ResNet [72]. We replaced weight normalization [49] with group normalization [66] to make the implementation simpler. Our 32 _×_ 32 models use four feature map resolutions (32 _×_ 32 to 4 _×_ 4), and our 256 _×_ 256 models use six. All models have two convolutional residual blocks per resolution level and self-attention blocks at the 16 _×_ 16 resolution between the convolutional blocks [6]. Diffusion time _t_ is specified by adding the Transformer sinusoidal position embedding [60] into each residual block. Our CIFAR10 model has 35.7 million parameters, and our LSUN and CelebA-HQ models have 114 million parameters. We also trained a larger variant of the LSUN Bedroom model with approximately 256 million parameters by increasing filter count. 

We used TPU v3-8 (similar to 8 V100 GPUs) for all experiments. Our CIFAR model trains at 21 steps per second at batch size 128 (10.6 hours to train to completion at 800k steps), and sampling a batch of 256 images takes 17 seconds. Our CelebA-HQ/LSUN (256<sup>2</sup> ) models train at 2.2 steps per second at batch size 64, and sampling a batch of 128 images takes 300 seconds. We trained on CelebA-HQ for 0.5M steps, LSUN Bedroom for 2.4M steps, LSUN Cat for 1.8M steps, and LSUN Church for 1.2M steps. The larger LSUN Bedroom model was trained for 1.15M steps. 

Apart from an initial choice of hyperparameters early on to make network size fit within memory constraints, we performed the majority of our hyperparameter search to optimize for CIFAR10 sample quality, then transferred the resulting settings over to the other datasets: 

- We chose the _βt_ schedule from a set of constant, linear, and quadratic schedules, all constrained so that _LT ≈_ 0. We set _T_ = 1000 without a sweep, and we chose a linear schedule from _β_ 1 = 10<sup>_−_4</sup> to _βT_ = 0 _._ 02. 

- We set the dropout rate on CIFAR10 to 0 _._ 1 by sweeping over the values _{_ 0 _._ 1 _,_ 0 _._ 2 _,_ 0 _._ 3 _,_ 0 _._ 4 _}_ . Without dropout on CIFAR10, we obtained poorer samples reminiscent of the overfitting artifacts in an unregularized PixelCNN++ [52]. We set dropout rate on the other datasets to zero without sweeping. 

- We used random horizontal flips during training for CIFAR10; we tried training both with and without flips, and found flips to improve sample quality slightly. We also used random horizontal flips for all other datasets except LSUN Bedroom. 

- We tried Adam [31] and RMSProp early on in our experimentation process and chose the former. We left the hyperparameters to their standard values. We set the learning rate to 2 _×_ 10<sup>_−_4</sup> without any sweeping, and we lowered it to 2 _×_ 10<sup>_−_5</sup> for the 256 _×_ 256 images, which seemed unstable to train with the larger learning rate. 

14 

- We set the batch size to 128 for CIFAR10 and 64 for larger images. We did not sweep over these values. 

- We used EMA on model parameters with a decay factor of 0.9999. We did not sweep over this value. 

Final experiments were trained once and evaluated throughout training for sample quality. Sample quality scores and log likelihood are reported on the minimum FID value over the course of training. On CIFAR10, we calculated Inception and FID scores on 50000 samples using the original code from the OpenAI [51] and TTUR [21] repositories, respectively. On LSUN, we calculated FID scores on 50000 samples using code from the StyleGAN2 [30] repository. CIFAR10 and CelebA-HQ were loaded as provided by TensorFlow Datasets ( `https://www.tensorflow.org/datasets` ), and LSUN was prepared using code from StyleGAN. Dataset splits (or lack thereof) are standard from the papers that introduced their usage in a generative modeling context. All details can be found in the source code release. 

# **C Discussion on related work** 

Our model architecture, forward process definition, and prior differ from NCSN [55, 56] in subtle but important ways that improve sample quality, and, notably, we directly train our sampler as a latent variable model rather than adding it after training post-hoc. In greater detail: 

1. We use a U-Net with self-attention; NCSN uses a RefineNet with dilated convolutions. We condition all layers on _t_ by adding in the Transformer sinusoidal position embedding, rather than only in normalization layers (NCSNv1) or only at the output (v2). 

2. Diffusion models scale down the data with each forward process step (by a<sup>_√_</sup> 1 _− βt_ factor) so that variance does not grow when adding noise, thus providing consistently scaled inputs to the neural net reverse process. NCSN omits this scaling factor. 

3. Unlike NCSN, our forward process destroys signal ( _D_ KL( _q_ ( **x** _T |_ **x** 0) _∥N_ ( **0** _,_ **I** )) _≈_ 0), ensuring a close match between the prior and aggregate posterior of **x** _T_ . Also unlike NCSN, our _βt_ are very small, which ensures that the forward process is reversible by a Markov chain with conditional Gaussians. Both of these factors prevent distribution shift when sampling. 

4. Our Langevin-like sampler has coefficients (learning rate, noise scale, etc.) derived rigorously from _βt_ in the forward process. Thus, our training procedure directly trains our sampler to match the data distribution after _T_ steps: it trains the sampler as a latent variable model using variational inference. In contrast, NCSN’s sampler coefficients are set by hand post-hoc, and their training procedure is not guaranteed to directly optimize a quality metric of their sampler. 

# **D Samples** 

**Additional samples** Figure 11, 13, 16, 17, 18, and 19 show uncurated samples from the diffusion models trained on CelebA-HQ, CIFAR10 and LSUN datasets. 

**Latent structure and reverse process stochasticity** During sampling, both the prior **x** _T ∼ N_ ( **0** _,_ **I** ) and Langevin dynamics are stochastic. To understand the significance of the second source of noise, we sampled multiple images conditioned on the same intermediate latent for the CelebA 256 _×_ 256 dataset. Figure 7 shows multiple draws from the reverse process **x** 0 _∼ pθ_ ( **x** 0 _|_ **x** _t_ ) that share the latent **x** _t_ for _t ∈{_ 1000 _,_ 750 _,_ 500 _,_ 250 _}_ . To accomplish this, we run a single reverse chain from an initial draw from the prior. At the intermediate timesteps, the chain is split to sample multiple images. When the chain is split after the prior draw at **x** _T_ =1000, the samples differ significantly. However, when the chain is split after more steps, samples share high-level attributes like gender, hair color, eyewear, saturation, pose and facial expression. This indicates that intermediate latents like **x** 750 encode these attributes, despite their imperceptibility. 

**Coarse-to-fine interpolation** Figure 9 shows interpolations between a pair of source CelebA 256 _×_ 256 images as we vary the number of diffusion steps prior to latent space interpolation. Increasing the number of diffusion steps destroys more structure in the source images, which the 

15 

model completes during the reverse process. This allows us to interpolate at both fine granularities and coarse granularities. In the limiting case of 0 diffusion steps, the interpolation mixes source images in pixel space. On the other hand, after 1000 diffusion steps, source information is lost and interpolations are novel samples. 



<!-- Start of picture text -->
Source Rec. λ=0.1 λ=0.2 λ=0.3 λ=0.4 λ=0.5 λ=0.6 λ=0.7 λ=0.8 λ=0.9 Rec. Source<br>1000 steps<br>875 steps<br>750 steps<br>625 steps<br>500 steps<br>375 steps<br>250 steps<br>125 steps<br>0 steps<br><!-- End of picture text -->

Figure 9: Coarse-to-fine interpolations that vary the number of diffusion steps prior to latent mixing. 



<!-- Start of picture text -->
10<br>8 300<br>6 200<br>4<br>100<br>2<br>0<br>0 200 400 600 800 1 , 000 0 200 400 600 800 1 , 000<br>Reverse process steps ( T − t ) Reverse process steps ( T − t )<br>FID<br>Inception Score<br><!-- End of picture text -->

Figure 10: Unconditional CIFAR10 progressive sampling quality over time 

16 



Figure 11: CelebA-HQ 256 _×_ 256 generated samples 

17 





<!-- Start of picture text -->
(a) Pixel space nearest neighbors<br><!-- End of picture text -->





<!-- Start of picture text -->
(b) Inception feature space nearest neighbors<br><!-- End of picture text -->

Figure 12: CelebA-HQ 256 _×_ 256 nearest neighbors, computed on a 100 _×_ 100 crop surrounding the faces. Generated samples are in the leftmost column, and training set nearest neighbors are in the remaining columns. 

18 



Figure 13: Unconditional CIFAR10 generated samples 

19 



Figure 14: Unconditional CIFAR10 progressive generation 

20 





<!-- Start of picture text -->
(a) Pixel space nearest neighbors<br>(b) Inception feature space nearest neighbors<br><!-- End of picture text -->

Figure 15: Unconditional CIFAR10 nearest neighbors. Generated samples are in the leftmost column, and training set nearest neighbors are in the remaining columns. 

21 



Figure 16: LSUN Church generated samples. FID=7 _._ 89 

22 



Figure 17: LSUN Bedroom generated samples, large model. FID=4 _._ 90 

23 



Figure 18: LSUN Bedroom generated samples, small model. FID=6 _._ 36 

24 



Figure 19: LSUN Cat generated samples. FID=19 _._ 75 

25 

