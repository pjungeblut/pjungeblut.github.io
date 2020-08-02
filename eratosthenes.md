---
title: Engineering the Sieve of Eratosthenes
description: Fast Prime Number Generation utilizing 2,3,5-Wheel and Cache Locality
---

# Engineering the Sieve of Eratosthenes

The [Sieve of Eratosthenes](https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes) is the simplest algorithm to generate all prime numbers up to a given upper bound $N$.
Although there are faster algorithms to do this, we only consider the classical variant in this post and try to implement it as fast as possible.
Such an optimized version can then be used as a baseline for *fair* comparisons with more sophisticated algorithms (for example the [Sieve of Atkin](https://en.wikipedia.org/wiki/Sieve_of_Atkin)).

We start with a textbook implementation as a baseline.
Then we use a 2,3,5-wheel to erase many composites from the sieve directly without further computation.
In a last step we change the order of the remaining operations to effectively use the processors L3 cache.

## Textbook Variant

We start with the textbook implementation shown below.
Vector `sieve` contains $N + 1$ boolean values and after running the algorithm the value at index $i$ indicated whether $i$ is a prime number.
```c++
std::vector<bool> sieve;

eratosthenes(uint64_t N) {
  sieve.assign(N + 1, true);
  sieve[0] = sieve[1] = false;
  
  for (uint64_t i = 2; i * i <= N; ++i) { // (1)
    if (sieve[i]) {
      for (uint64_t j = i * i; j <= N; j += i) { // (2)
        sieve[j] = false;
      }
    }
  }
}
```
There are already two non-trivial optimizations in above code.
Firstly, in line (1) index $i$ only runs up to $\sqrt{N}$ instead of $N$.
This is correct, because every number up to $N$ is either a prime number or has a prime factor no bigger than $\sqrt{N}$.
Secondly, index $j$ in line (2) starts at $i^2$ as all smaller multiples of $i$ have a prime factor strictly smaller than $i$ and are therefore already set to `false` in the sieve.

For $N = 10^9$ my computer needs a little more than $9$ seconds for this variant.
Most time is spent erasing composites from the sieve and we will see next how to reduce the amount work necessary.

## Implicitly Erase Many Composites with a 2,3,5-Wheel

The three smallest prime numbers are $2$, $3$ and $5$ and the first step is to set all their strict multiples to `false` in the sieve.
We notice that the sequence of steps between the unchanged fields gets periodic with a period length of $30 = 2 \cdot 3 \cdot 5$:
The only numbers remaining as prime number candidates are the ones with remainder $1$, $7$, $11$, $13$, $17$, $19$, $23$ or $29$ modulo $30$.
All others are definitely composites (except for $2$, $3$ and $5$ themselves) so we do not need to store them in the sieve at all.
For any block of $30$ consecutive numbers we therefore only need $8$ bits (or one byte) of memory.

This immediately saves us around $\frac{22}{30}$ of the memory needed, but at the cost of the additional complexity introduced by only storing some values in the sieve.
Starting at a value with remainder $1$ modulo $30$ the steps between any two remaining candidates form the periodic sequence $\{6,4,2,4,2,4,6,2\}$.
We can use this to optimize the outer loop.
The functions `read_value` and `clear_bit` below read and clear a bit in the compressed sieve.
We go into detail later on how to implement them.
```c++
std::vector<bool> sieve;
const uint8_t offsets[8] = {6, 4, 2, 4, 2, 4, 6, 2};
const uint64_t NUMBERS_PER_BYTE = 2 * 3 * 5;

bool read_value(uint64_t n) {
  // Returns whether the bit corresponding to n is set to true in the sieve.
}

void clear_bit(uint64_t n) {
  // Sets the bit corresponding to n to false.
}

void eratosthenes(uint64_t N) {
  const uint64_t M = (N + NUMBERS_PER_BYTE - 1) / NUMBERS_PER_BYTE; // (1)
  sieve.assign(M, true);
  
  for (uint64_t i = 7, o = 1; i * i <= N; i += offsets[o++ % 8]) { // (2)
    if (sieve[i]) {
      for (uint64_t j = i * i; j <= N; j += i) {
        sieve[j] = false;
      }
    }
  }
}
```
Line (1) computes the size of the compressed sieve, which is $\lceil \frac{N}{2 \cdot 3 \cdot 5} \rceil$.
In line (2) we changed two things:
Firstly we now start at $i = 7$ which is the first prime bigger than $5$.
Secondly we changed the way $i$ is increased.
Instead of incrementing it in every step, we jump right to the next value having remainder in $\{1,7,11,3,17,19,23,29\}$ modulo $30$.
How far we need to jump is stored in the array `offsets` and the new loop variable $o$ points to the correct index inside this array.
As we start with $i = 7$, we initialize $o = 1$.

### Avoiding Conditional Jumps

## Cache Optimization

## Even more?
Is it possible to get even faster?
One thing to try would be using a bigger wheel, i.e. a 2,3,5,7-wheel or even bigger.
I would be very interested in any ways to further speed up this implementation.
If you know of any significant improvement, please tell me.
