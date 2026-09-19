"""Executed teaching examples inserted after their matching lesson sections."""
PRICE_SNIPPETS={
 'two-price-series':'''for name,prices in [('A',PRICE_A),('B',PRICE_B)]:
    values=price_returns(prices)
    simple=math.prod(1+r['simple'] for r in values)-1
    log_total=sum(r['log'] for r in values)
    close(simple,.04); close(math.expm1(log_total),.04)
    print(name,prices)
    print('Simple returns (%)',[round(r['simple']*100,6) for r in values])
    print(f'Total simple {simple:.6%}; total log {log_total:.6%}')
scaled=price_returns([p*.5 for p in PRICE_B])
for a,b in zip(price_returns(PRICE_B),scaled):close(a['log'],b['log'])''',
 'return-definitions':'''simple,log_return=return_pair(100,99,2)
close(simple,.01)
print(f'Dividend-inclusive: simple={simple:.6%}, log={log_return:.6%}')
print('Split 2:1: value before=',1*100,'value after=',2*50)
close(2*50/100-1,0)
compound=1.2*.8-1
geometric=math.sqrt(.96)-1
print(f'+20%, -20%: cumulative={compound:.6%}; geometric per period={geometric:.6%}')
close(compound,-.04)''',
 'other-return-series':'''for fx in [.02,-.02]:
    home=(1.05)*(1+fx)-1
    print(f'Local +5%, FX {fx:+.1%}: home return {home:.3%}')
close(1.05*1.02-1,.071);close(1.05*.98-1,.029)
forward=.02;reverse=1/(1+forward)-1
close(math.log1p(reverse),-math.log1p(forward))
print(f'Reverse FX quote: simple {reverse:.6%}; log sign reverses exactly')'''
}
PROCESS_SNIPPETS={
 'random-variables':'''xs=[-1,0,1];ys=[x*x for x in xs]
ex=statistics.mean(xs);ey=statistics.mean(ys)
cov=statistics.mean((x-ex)*(y-ey) for x,y in zip(xs,ys))
close(cov,0)
print('X=',xs,'Y=X^2=',ys,'Cov(X,Y)=',cov)
print('Y is determined by X despite zero covariance.')''',
 'stationarity':'''innovation_variance=4
for time in [1,5,10]:print('Random walk variance at t=',time,':',time*innovation_variance)
print('Variance of each first difference:',innovation_variance)
close(10*innovation_variance,40)''',
 'arma-examples':'''for phi,theta in [(.6,.3),(-.6,.3),(.6,-.6)]:
    model=arma11(phi,theta)
    data=simulate_arma(phi,theta)
    print(f'phi={phi}, theta={theta}: variance={model["variance"]:.6f}, rho1={model["acf"][1]:.6f}, rho2={model["acf"][2]:.6f}')
    print('Sample lag 1:',acf(data)[1])
close(arma11(.6,.3)['variance'],2.265625)
close(arma11(.6,-.6)['acf'][1],0)''',
 'arima':'''white_variance=1
# First-difference white noise: e_t - e_(t-1) is MA(1) with theta=-1.
model=arma11(0,-1,white_variance)
close(model['variance'],2);close(model['acf'][1],-.5)
print('Over-differenced white noise: variance',model['variance'],'rho1',model['acf'][1])''',
 'arfima':'''weights=fractional_weights(.3,8);rho=arfima_acf(.3,20)
print('Fractional difference weights:',weights)
print('ARFIMA(0,.3,0) ACF lags 1,2,5,20:',[rho[k] for k in [1,2,5,20]])
close(weights[1],-.3);close(weights[2],-.105);close(weights[3],-.0595)
close(rho[1],3/7)''',
 'linear-processes':'''phi,theta=.6,.3
psi=[1]+[(phi+theta)*phi**(j-1) for j in range(1,500)]
gamma0=sum(x*x for x in psi)
gamma1=sum(psi[j]*psi[j+1] for j in range(len(psi)-1))
model=arma11(phi,theta)
close(gamma0,model['variance']);close(gamma1/gamma0,model['acf'][1])
print('ARMA moments from 500 linear coefficients:',gamma0,gamma1/gamma0)''',
 'continuous-time':'''kappa,eta,delta=2,.3,1/252
phi=math.exp(-kappa*delta)
stationary_variance=eta**2/(2*kappa)
innovation_variance=stationary_variance*(1-phi**2)
close(arma11(phi,0,innovation_variance)['variance'],stationary_variance)
print('OU sampled daily: phi=',phi,'stationary variance=',stationary_variance,'innovation variance=',innovation_variance)'''
}
STYLIZED_SNIPPETS={
 'summary-statistics':'''values=[-.02,-.01,0,.01,.06]
stats=summary_stats(values)
print('Five hypothetical returns:',stats)
close(stats['mean'],.008);close(stats['sd'],math.sqrt(.00097))
flipped=summary_stats([-v for v in values])
close(flipped['skewness'],-stats['skewness']);close(flipped['kurtosis'],stats['kurtosis'])''',
 'average-returns-risk-premia':'''daily_mean,daily_sd,n=.0004,.012,2520
annual_mean=252*daily_mean
annual_mean_se=252*daily_sd/math.sqrt(n)
close(annual_mean,.1008)
print(f'Annualized mean log return {annual_mean:.4%}; iid standard error {annual_mean_se:.4%}')
print('This standard error is uncertainty about the estimated mean, not annual return volatility.')''',
 'standard-deviations':'''sd,rho=.01,.3
variance=2*sd**2+2*rho*sd**2
print(f'Two-day SD with correlation .3: {math.sqrt(variance):.6%}; uncorrelated: {math.sqrt(2)*sd:.6%}')
close(variance,.00026)''',
 'return-distributions':'''for nu in [5,10]:
    print('Student-t degrees of freedom',nu,'variance-normalized kurtosis',3+6/(nu-4))
# Midpoint integration checks unit area and variance. Finite tail cutoff is explicit.
step=.002
area=second=0
for i in range(100000):
    x=-100+(i+.5)*step;mass=standardized_t_pdf(x,5)*step
    area+=mass;second+=x*x*mass
assert abs(area-1)<1e-7 and abs(second-1)<5e-5
print('t(5) density numerical integral on [-100,100]:',area,'second moment:',second)''',
 'transformed-autocorrelations':'''for phi in [.6,-.6]:
    raw=arma11(phi,0)['acf']
    print('Gaussian AR(1), phi=',phi,'raw ACF lag1=',raw[1],'squared ACF lag1=',raw[1]**2)
close(.6**2,.36)''',
 'nonlinearity':'''# X_t=e_t e_(t-1); iid standard Normal moments E[e^2]=1 and E[e^4]=3.
variance=1
fourth=3*3
cross_squared=1*3*1
squared_correlation=(cross_squared-variance**2)/(fourth-variance**2)
close(squared_correlation,.25)
print('Nonlinear product process: raw ACF lag1=0; squared ACF lag1=',squared_correlation)''',
 'calendar-acf-appendix':'''calendar=calendar_acf()
close(calendar['variance'],.000104)
close(calendar['acf'][1],-1/104);close(calendar['acf'][5],4/104)
print('Pooled calendar ACF lags 1..15:',calendar['acf'][1:])
assert all(v==0 for v in calendar_acf(0)['acf'][1:])
print('Known weekday means removed: independent residuals have theoretical ACF zero.')''',
 'squared-linear-appendix':'''import itertools
# Innovations: +/-sqrt(6) with probability 1/12 each; zero with probability 5/6.
# Mean 0, variance 1, kurtosis 6, fourth cumulant 3.
points=[(-math.sqrt(6),1/12),(0,5/6),(math.sqrt(6),1/12)]
theta=.5
ex2=ex4=cross=0
for (a,pa),(b,pb),(c,pc) in itertools.product(points,repeat=3):
    weight=pa*pb*pc;x=a+theta*b;previous=b+theta*c
    ex2+=weight*x*x;ex4+=weight*x**4;cross+=weight*x*x*previous*previous
exact=(cross-ex2**2)/(ex4-ex2**2)
formula=squared_linear_correlation([1,theta],3)
close(exact,formula);close(formula,20/101)
close(squared_linear_correlation([1,theta],0),.16)
print('Squared MA(1) correlation: Gaussian .16; non-Gaussian exact=',exact,'formula=',formula)'''
}
