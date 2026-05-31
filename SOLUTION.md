# Solution

## Overview

I've played around with Django in personal projects but never shipped it in 
production. My day to day is Python with AWS (Lambda, DynamoDB, CDK, etc) so the 
backend architecture felt familiar, it was mostly Django's specific patterns I had 
to get up to speed on. I used AI and the Django/DRF docs to fill those gaps, and 
I can explain every decision in here.

---

## Backend

### Why DRF over plain Django views

Django views on their own are designed for server rendered HTML. You can bend them 
into returning JSON but you end up manually handling serialization, auth checking, 
input validation, and status codes on every endpoint. DRF gives you all of that 
as building blocks, serializers, permission classes, ViewSets, so the actual view 
logic stays clean and focused on what the endpoint is supposed to do.

### Authentication

I went with DRF's built in token auth. Login returns a token, client stores it, 
sends it on every request. No extra packages, straightforward to reason about.

I looked at simplejwt, the main advantage is no database lookup on every request 
since the token is self contained and cryptographically verified. For this scale 
that difference is irrelevant. Built in token auth was simpler to set up and one 
less thing to worry about. I'd switch to JWT with short lived access tokens and 
refresh rotation in production.

### vote_count, stored vs computed

The spec suggested storing vote_count on Idea and I went with that.

The alternative is computing it at query time with 
annotate(vote_count=Count('votes')), a SQL JOIN that counts actual Vote rows on 
every request. Always accurate, simpler write logic. The tradeoff is that JOIN 
on every ideas fetch. For a read heavy app like this, storing it and keeping the 
reads cheap makes more sense.

The tricky part with a stored counter is concurrent writes. If two users vote at 
the same time and you read vote_count into Python, increment it, then write it 
back, one of those writes will overwrite the other. Django's F() expression 
solves this by doing the increment inside the database itself in a single 
operation, so there's no window for a race. I also wrapped the Vote insert and 
the count update in transaction.atomic() so if either operation fails they both 
roll back, the Vote row and the count can never get out of sync.

### One vote per user

Two layers : a UniqueConstraint on (idea, user) in the database, and get_or_create 
in the view.

The database constraint is the real enforcement. It physically rejects duplicate 
pairs, even if two requests slip through simultaneously. The application check 
with get_or_create is so the client gets a clean 400 with a readable error message 
rather than a raw database exception turning into a 500.

### User deletion

Ideas use SET_NULL : content stays, author goes null. Deleting an account shouldn't 
take down everything that person contributed.

Votes use CASCADE : gone with the user. A vote with no owner would permanently 
inflate counts with no way to reconcile them, so that's an easy call.

### CORS

React on 5175, Django on 8001, browsers block that by default. Added 
django-cors-headers and whitelisted the dev origin. In production they'd likely share a 
domain and this wouldn't be needed.

---

## Frontend

### React Query

I used React Query for data fetching. The pattern it replaces, useState for data, 
useState for loading, useState for error, useEffect to fetch, manual cleanup, you 
end up copying that into every component that needs data. useQuery collapses all 
of that into one call and handles the caching too.

For mutations I used useMutation which gives you isPending and isError states 
without managing them yourself. After any write I call invalidateQueries to mark 
the cache stale and trigger a refetch so the UI always reflects the actual database 
state.

### Keeping it simple

Two pages, login and ideas. No React Router, no state management library. A token 
check in App.jsx decides what to render. Adding more infrastructure than the 
problem needs just creates more surface area to explain and more things to go wrong.

### Token in localStorage

localStorage is readable by any JavaScript on the page which makes it vulnerable 
to XSS. An httpOnly cookie would be safer, the browser holds it but JavaScript 
can never access it. The downside is you then need to handle CSRF on the backend 
since cookies are sent automatically cross origin.

For this project localStorage is fine. Nothing sensitive is at stake and the spec 
explicitly says token auth is acceptable. I'd move to httpOnly cookies in 
production.

---

## Bonus: optimistic voting UX

Clicking vote updates the count instantly rather than waiting for the server to 
respond.

onMutate fires before the API call. It cancels any in flight refetches to prevent 
them overwriting the update, snapshots the current cache for rollback, then patches 
the ideas list directly, flipping has_voted and nudging vote_count by 1.

If the server rejects it, onError restores the snapshot immediately so the count 
snaps back without a round trip. onSettled runs either way and refetches from the 
server so the final state always matches the database.

One known gap, this assumes network availability. The rollback handles a failed 
request fine but there's no offline queue. React Query's networkMode: 'offlineFirst' 
with queued mutations would handle that properly but it's out of scope here.

---

## Known limitations

- Tokens never expire : production needs JWT with refresh token rotation
- Token in localStorage : httpOnly cookies would be safer against XSS
- No pagination : returns all ideas in one query, doesn't scale
- Optimistic voting has no offline queue : failed requests roll back but unsynced 
  mutations aren't queued for retry

---

## What I'd change with more time

- JWT with short lived access tokens and refresh rotation
- Pagination on the ideas list
- PostgreSQL instead of SQLite
- Proper environment variable management : right now settings are hardcoded
- httpOnly cookies for token storage

---

---

## AI Usage

I used Claude as a learning tool throughout this project. My background is Python 
and AWS so I was comfortable with the architecture and backend logic, I mainly 
needed help getting up to speed on Django's specific patterns and Tailwind's syntax. 
I also referenced the official Django and DRF documentation throughout.

---

### Django concepts I needed to brush up on or hadn't used in this context

I've used Django in personal projects but not at this level, DRF, token auth, 
and building a proper API were new territory. Here are the specific things I 
looked up and reasoned through:

**"Explain Django migrations to me, I come from a DynamoDB background"**  
I'd used migrations before in personal projects but never thought deeply about 
them. Claude explained it in terms of DynamoDB, migrations are version control 
for your database structure, makemigrations diffs your models, migrate applies 
the SQL. Helped me think about schema changes more deliberately.

**"What's the difference between ViewSet and ModelViewSet?"**  
I could see both in the DRF docs but didn't understand when to use which. Claude 
explained that ModelViewSet gives you list/create/retrieve/update/destroy for free 
and you only override what you need to customise. ViewSet is blank, you write 
everything yourself. That's why IdeaViewSet uses ModelViewSet and AuthView uses 
ViewSet, login has nothing to do with CRUD.

**"Why does related_name exist and what does it actually do?"**  
When setting up the Vote model I kept seeing related_name in examples but wasn't 
confident about what it actually did in practice. Claude explained it creates a 
reverse relationship, from an Idea you can call idea.votes.all() instead of 
Vote.objects.filter(idea=idea). I then wrote the models myself once I understood it.

**"What does perform_create do and why can't I just set created_by in the view?"**  
I wanted to attach the logged in user to a new idea. Claude explained perform_create 
is a hook that runs just before saving, the serializer has already validated the 
data at that point so it's the right place to inject server side values the client 
shouldn't control.

---

### Race conditions and atomic operations

**"I'm storing vote_count on the Idea model. I know from DynamoDB that concurrent 
writes are a problem, in DynamoDB I'd use conditional writes. How does Django 
handle this?"**  
Claude explained Django's F() expression, instead of reading the value into Python, 
incrementing it, then writing it back (which creates a race window), F() does the 
increment inside the database in a single SQL operation. I then read the Django docs 
on F() expressions and transaction.atomic() to understand it properly before 
implementing it.

**"What does transaction.atomic() actually do and why do I need it alongside F()?"**  
F() makes the increment safe but I still had two separate operations, inserting 
the Vote row and updating vote_count. Claude explained that transaction.atomic() 
wraps them so either both succeed or both roll back. Without it a server crash 
between the two operations would leave them out of sync.

---

### Design decisions I reasoned through with AI assistance

**"Should vote_count be stored on the Idea model or computed from the Vote table 
using annotate, what are the tradeoffs for a read heavy app?"**  
I understood both approaches from reading the DRF and Django docs. I used Claude 
to pressure test my thinking, is a JOIN on every request actually a problem, when 
would you switch to storing it. Concluded that for a read heavy voting board, 
storing it with atomic updates makes more sense.

**"Should I use CASCADE or SET_NULL on user deletion for ideas vs votes?"**  
I had an instinct that ideas should be preserved but wanted to think through votes 
properly. Claude helped me reason through the vote case, a vote with no owner 
permanently inflates counts with no way to reconcile them, so CASCADE is the right 
call there.

**"If I have a UniqueConstraint at the DB level, do I still need to handle the 
duplicate case in the view or will Django surface a decent error automatically?"**  
I knew I needed the constraint and had already written the get_or_create check. 
I just wanted to confirm my reasoning, that without the application check a 
duplicate vote would bubble up as a raw database exception and return a 500. 
Claude confirmed that and I kept both layers in.

---

### Optimistic voting UX

**"How does React Query's optimistic update pattern work with onMutate, onError, 
and onSettled?"**  
I knew what optimistic UI meant but hadn't implemented it with React Query before. 
Claude walked me through the pattern, onMutate patches the cache immediately, 
onError restores the snapshot if the server rejects it, onSettled reconciles with 
the server either way.

---

### Code I asked Claude to review or help with

**Vote action, two methods with the same name**  
I mistakenly originally wrote the vote and unvote as separate methods with the same name:

```python
@action(detail=True, methods=['post'])
def vote(self, request, pk=None):
    ...

@action(detail=True, methods=['delete'])
def vote(self, request, pk=None):
    ...
```

My test was returning 405. I pasted this to Claude and it spotted that Python 
silently overwrites the first method with the second, only the DELETE handler 
existed. The fix was combining them. I later updated this code for atomic writes, etc:

```python
@action(detail=True, methods=['post', 'delete'])
def vote(self, request, pk=None):
    if request.method == 'POST':
        ...
    if request.method == 'DELETE':
        ...
```

**Serializer context, has_voted always returning False**  
I had this in my serializer:

```python
def get_has_voted(self, obj):
    request = self.context.get('request')
    if request and request.user.is_authenticated:
        return obj.votes.filter(user=request.user).exists()
    return False
```

It was always returning False. I asked Claude why and learned I wasn't passing 
the request into the serializer context. The fix:

```python
def get_serializer_context(self):
    return {**super().get_serializer_context(), 'request': self.request}
```

**F() expression, asked Claude to review my original vote update**  
I originally wrote:

```python
idea.vote_count += 1
idea.save()
```

I asked Claude if this was safe under concurrent load. It explained the race 
condition, two requests could both read vote_count = 5, both increment to 6, 
both write 6, losing a vote. The fix was F():

```python
Idea.objects.filter(id=idea.id).update(vote_count=F('vote_count') + 1)
```

**Authorization header, 401 despite sending a token**  
My React api.js had:

```js
config.headers.Authorization = `Bearer ${token}`
```

Getting 401 on every authenticated request. Pasted to Claude, it spotted I was 
using simplejwt's Bearer format but I was on DRF's built in token auth which 
expects Token. Fixed to:

```js
config.headers.Authorization = `Token ${token}`
```

---

### Tailwind and React UI

**"What Tailwind classes would I use for a clean minimal input field?"**  
I know React but hadn't used Tailwind much. I used Claude to understand the utility 
class pattern and get initial class suggestions, then adjusted everything to match 
what I wanted. 

**"How do I conditionally apply Tailwind classes based on state in React?"**  
Needed this for the vote button (blue when voted, gray when not) and the sort 
buttons (active vs inactive). Claude showed me the pattern of using a ternary 
inside the className string.

---

### Debugging

**"makemigrations is throwing a reverse accessor clash"**  
I'd given two ForeignKeys pointing at User the same related_name. Claude explained 
what a reverse accessor is and why they clash, I fixed it myself once I understood.

---

### Assets

**"Create an elegant favicon SVG for a project called Voting Board"**  
Iterated through a few concepts and picked the upward arrow with a vote count badge 
as it best represented what the app does.

---

The decisions in this codebase are mine. I used AI the same way I'd use 
documentation or Stack Overflow, to understand something I hadn't seen before, 
then apply it.