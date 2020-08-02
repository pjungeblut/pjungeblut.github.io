---
title: Engineering the Sieve of Eratosthenes
description: Fast Prime Number Generation utilizing 2,3,5-Wheel and Cache Locality
---

# Engineering the Sieve of Eratosthenes

The [Sieve of Eratosthenes](https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes) is the simplest algorithm to generate all prime numbers up to a given upper bound $N$.
Although there are faster algorithms to do this, we only consider the classical variant in this post and try to implement it as fast as possible.
Such an optimized version can then be used as a baseline for *fair* comparisons with more sophisticated algorithms (for example the [Sieve of Atkin](https://en.wikipedia.org/wiki/Sieve_of_Atkin)).

## Textbook Variant

We start with the textbook implementation shown below.
Vector `sieve` contains $N + 1$ boolean values and after running the algorithm the value at index $i$ indicated whether $i$ is a prime number.
```c++
std::vector<bool> sieve(N + 1, true);
sieve[0] = sieve[1] = false;
for (uint64_t i = 2; i * i <= N; ++i) { // (1)
  if (sieve[i]) {
    for (uint64_t j = i * i; j <= N; j += i) { // (2)
      sieve[j] = false;
    }
  }
}

```
There are already two non-trivial optimizations in above code.
Firstly, in line (1) index $i$ only runs up to $\sqrt(N)$ instead of $N$.
This is correct, because every number up to $N$ is either a prime number or has a prime factor no bigger than $\sqrt(N)$.
Secondly, index $j$ in line (2) starts at $i^2$ as all smaller multiples of $i$ have a prime factor strictly smaller than $i$ and are therefore already cleared form the sieve.

## Even more?
Is it possible to get even faster?
One thing to try would be using a bigger wheel, i.e. a 2,3,5,7-wheel or even bigger.
I would be very interested in any ways to further speed up this implementation.
If you know of any significant improvement, please tell me.
