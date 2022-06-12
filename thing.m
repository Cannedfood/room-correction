w = 2*pi/15*[0:14];
wfine = 2*pi/151*[0:150]

% A = (w <= .5*pi) | (w >= 1.5*pi);
A = (w <= .5*pi);
ph = w*7;

H = A.*exp(-j*w);
h = real(ifft(H));

hold on

f = figure(1);
plot(w, A, 'go');
plot(wfine, abs(freqz(h, 1, wfine)));

% f2 = figure(2);
% plot(w, h);
% plot(w, real(H));
hold off

waitfor(f)
