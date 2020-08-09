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
The idea is simple:
Vector `sieve` contains $N + 1$ boolean values, one for each element $i \in \{0, \ldots, N\}$ and the element at index $i$ shall indicate whether $i$ is a prime number.
Initially all elements of `sieve` are set to `true`, except for for $i=0$ and $i=1$ which we know are not prime.
Now we loop through `sieve` starting at $i = 2$
Whenever `sieve[i]` is `true`, $i$ must be a prime number and we set `sieve[j]` to `false` for all strict multiples $j$ of $i$.
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

## 2,3,5-Wheel - Optimizations

### Compressing the Sieve

The three smallest prime numbers are $2$, $3$ and $5$ and the first step in the Sieve of Eratosthenes is to set all their strict multiples to `false` in the sieve.
We notice that there is a periodic pattern in the numbers set to `false` with a period length of $30 = 2 \cdot 3 \cdot 5$:
The only numbers remaining as prime number candidates are the ones with remainder $1$, $7$, $11$, $13$, $17$, $19$, $23$ or $29$ modulo $30$.
All others are definitely composites (except for $2$, $3$ and $5$ themselves).
Our first optimization is therefore to not store them in the sieve at all:
For any block of $30$ consecutive numbers we use only $8$ bits (so one byte) of memory.

This saves around $\frac{22}{30}$ of the memory needed, but at the cost of the additional complexity introduced by storing only some values in the sieve.
We are now going to see how to implement this efficiently.
Assume we are at position $i$ in the outer loop and $i \equiv 1 \mod 30$.
Then the next value of $i$ we are interested in is $i + 6 \equiv 7 \mod 30$, so we increase $i$ by $6$.
Similarly for $i \equiv 7 \mod 30$ the next value we are interested in is $i + 4 \equiv 11 \mod 30$, so we increase $i$ by $4$.
Let us define a constant array `OFFSETS[8] = {6, 4, 2, 4, 2, 4, 6, 2}` storing the amount to increase $i$ by for each of the possible remainders $1$, $7$, $11$, $13$, $17$, $19$, $23$ and $29$, respectively.
The functions `read_bit` and `clear_bit` below read and clear a bit in the compressed sieve.
We go into detail later on how to implement them.
```c++
std::vector<uint8_t> sieve;
const uint8_t ALL_ONE = 0xFF;
const uint8_t OFFSETS[8] = {6, 4, 2, 4, 2, 4, 6, 2};
const uint64_t NUMBERS_PER_BYTE = 2 * 3 * 5;

void eratosthenes(uint64_t N) {
  const uint64_t M = (N + NUMBERS_PER_BYTE - 1) / NUMBERS_PER_BYTE; // (1)
  sieve.assign(M, ALL_ONE);
  
  for (uint64_t i = 7, o = 1; i * i <= N; i += OFFSETS[o++ % 8]) { // (2)
    if (read_bit(i)) {
      for (uint64_t j = i * i; j <= N; j += i) {
        clear_bit(j);
      }
    }
  }
}

bool is_prime(uint64_t n) { // (3)
  if (n == 0 || n == 1 || n == 4) return false;
  if (n == 2 || n == 3 || n == 5) return true;
  return read_bit(i);
}
```
Line (1) computes the size of the compressed sieve, which is $\left\lceil \frac{N}{2 \cdot 3 \cdot 5} \right\rceil$.
In line (2) we changed two things:
Firstly, we now start at $i = 7$ which is the first prime bigger than $5$.
Secondly, we changed the way $i$ is increased between two loop iterations.
Instead of incrementing it in every step, we jump right to the next number having a remainder in $\{1,7,11,3,17,19,23,29\}$ modulo $30$ using our `OFFSETS` array.
The new loop variable $o$ points to the correct index inside this array and is initialized with $o = 1$, as $i \equiv 7 \mod 30$.

At last we also need an `is_prime` function defined in line (3), as we can no longer just look at index $i$ for number $i$ in the `sieve` array.
It takes special care of the small values and calles `read_bit` for the bigger ones.

All of the complexity is now in the `read_bit` and `clear_bit` functions.
Here is two **very naive** implementations:
```c++
bool read_bit(uint64_t n) {
  const uint64_t idx = n / NUMBERS_PER_BYTE;
  if (n % NUMBERS_PER_BYTE == 1) return sieve[idx] & 1;
  if (n % NUMBERS_PER_BYTE == 7) return sieve[idx] & (1 << 1);
  if (n % NUMBERS_PER_BYTE == 11) return sieve[idx] & (1 << 2);
  if (n % NUMBERS_PER_BYTE == 13) return sieve[idx] & (1 << 3);
  if (n % NUMBERS_PER_BYTE == 17) return sieve[idx] & (1 << 4);
  if (n % NUMBERS_PER_BYTE == 19) return sieve[idx] & (1 << 5);
  if (n % NUMBERS_PER_BYTE == 23) return sieve[idx] & (1 << 6);
  if (n % NUMBERS_PER_BYTE == 29) return sieve[idx] & (1 << 7);
  return false;
}

void clear_bit(uint64_t n) {
  const uint64_t idx = n / NUMBERS_PER_BYTE;
  if (n % NUMBERS_PER_BYTE == 1) sieve[idx] &= ~1;
  if (n % NUMBERS_PER_BYTE == 7) sieve[idx] &= ~(1 << 1);
  if (n % NUMBERS_PER_BYTE == 11) sieve[idx] &= ~(1 << 2);
  if (n % NUMBERS_PER_BYTE == 13) sieve[idx] &= ~(1 << 3);
  if (n % NUMBERS_PER_BYTE == 17) sieve[idx] &= ~(1 << 4);
  if (n % NUMBERS_PER_BYTE == 19) sieve[idx] &= ~(1 << 5);
  if (n % NUMBERS_PER_BYTE == 23) sieve[idx] &= ~(1 << 6);
  if (n % NUMBERS_PER_BYTE == 29) sieve[idx] &= ~(1 << 7);
}
```

Implementing them naivley and measuring above code yields very disappointing results:
For $N=10^9$ the sieve now takes $27$ seconds, so three times slower than the textbook variant.
This is mainly due to the poor implementations of `read_bit` and `clear_bit`, so let us focus on them next.

### Operations on the Compressed Sieve: Avoiding Conditional Jumps
Each call to `read_bit` or `clear_bit` executes up to eight `if` statements.
As we can see on (Compiler Explorer)[https://godbolt.org/z/qG6nE3] the generated assembly contains many conditional jumps, whose results the compiler can hardly predict.
This leads to many pipeline flushes and thus the slow exectuion time.
Luckily, the operation done after each of the eight `if` statements is of the same structure.
In fact, we can eliminate all those `if`'s completely:
```c++
const uint8_t MASK[30] = {
    0, 0x80, 0,    0, 0, 0, 0, 0x40, 0,    0,
    0, 0x20, 0, 0x10, 0, 0, 0, 0x08, 0, 0x04,
    0,    0, 0, 0x02, 0, 0, 0,    0, 0, 0x01};

bool read_bit(uint64_t n) {
  return sieve[n / NUMBERS_PER_BYTE] & MASK[n % NUMBERS_PER_BYTE];
}

void clear_bit(uint64_t n) {
  sieve[n / NUMBERS_PER_BYTE] &= ~MASK[n % NUMBERS_PER_BYTE];
}
```
Now each call only executes a division, a modulo operation and one or two bit operations.

### Optimize Inner Loop: Skip Multiples of $2$, $3$ and $5$

## Cache Optimization

## Even more?
Is it possible to get even faster?
One thing to try would be using a bigger wheel, i.e. a 2,3,5,7-wheel or even bigger.
I would be very interested in any ways to further speed up this implementation.
If you know of any significant improvement, please tell me.
