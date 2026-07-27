# What we did — migration cleanup, 22 July 2026

We went through the database's history looking for changes nobody had a proper record of, checked
whether anything was broken or risky, and fixed the two things that needed fixing. Everything is done —
nothing is left open from this work.

## What we found

- The database had a bunch of old changes that were never properly written down. We tracked all of them
  down and checked each one against how the app actually behaves today.
- Almost all of them were fine — safe, working as intended, nothing to worry about.
- We found one real gap: a tool used to extend a customer's trial period was missing some safety checks.
  In a rare case, a staff member could have accidentally turned a paying customer back into a trial
  account.
- We also found a handful of internal tools that had more public access than they needed — not
  dangerous, since they were already protected another way, but worth tightening up.

## What we fixed

- Added the missing safety checks so the trial-extension tool can no longer be used on customers who are
  already paying or on our top tier.
- Removed the unnecessary public access from those internal tools, while making sure staff logins still
  work exactly the same as before.
- Double-checked both fixes are live and working correctly.

## What's left to do

Nothing from this piece of work. Everything identified has been checked, fixed where needed, and
confirmed. A separate, unrelated issue came up with how we apply database changes going forward — that's
being handled as its own conversation with the infrastructure and database leads, not part of this.
