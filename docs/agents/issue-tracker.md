# Issue tracker

Tickets are GitHub issues on [`blazephoenix/sands`](https://github.com/blazephoenix/sands/issues). Use the `gh` CLI. Do not keep tickets in local files; `.scratch/` is gone.

## Reading

- Pending work: `gh issue list` (open issues).
- One ticket: `gh issue view <n> --comments`. If that fails on "Projects (classic) is being deprecated" (older `gh`), use `gh issue view <n> --json title,body,comments`.

## Writing a ticket

- Title: what it delivers, in `CONTEXT.md` vocabulary.
- Body: **What to build**, then **Acceptance criteria** as a checklist. UI tickets also meet [`docs/design/ux-bar.md`](../design/ux-bar.md).
- Dependencies: a `Blocked by: #<n>` line.
- Create with `gh issue create --title "…" --body-file <file>`.

## Closing a ticket

- Work lands through a pull request whose body says `Closes #<n>`.
- Put the completion note (what changed, anything added beyond the ticket, screenshots of key states) in the pull request.

## Wayfinding operations

How `/wayfinder` maps live on this tracker. The commands use `gh api`, which works on any `gh` version.

- **Labels.** The map carries `wayfinder:map`. Each ticket carries one type: `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling` or `wayfinder:task`. Add one with `echo '{"labels":["wayfinder:grilling"]}' | gh api -X POST repos/blazephoenix/sands/issues/<n>/labels --input -`.
- **Child tickets** are GitHub sub-issues of the map. Create the ticket, then attach it with `addSubIssue`, which takes node ids (`gh api repos/blazephoenix/sands/issues/<n> --jq .node_id`):

  ```sh
  gh api graphql -f query='mutation($map:ID!,$ticket:ID!){ addSubIssue(input:{issueId:$map, subIssueId:$ticket}){ issue { number } } }' -f map=<map node id> -f ticket=<ticket node id>
  ```

- **Blocking** is GitHub's native "blocked by", not the `Blocked by:` body line. Wire it in a second pass, once every new ticket has an id:

  ```sh
  gh api graphql -f query='mutation($t:ID!,$b:ID!){ addBlockedBy(input:{issueId:$t, blockingIssueId:$b}){ issue { number } } }' -f t=<blocked ticket node id> -f b=<blocking ticket node id>
  ```

- **Claim** a ticket by assigning it before any work: `gh issue edit <n> --add-assignee <login>`.
- **Frontier**: the map's open, unassigned sub-issues whose blockers are all closed.

  ```sh
  gh api graphql -F n=<map number> -f query='query($n:Int!){ repository(owner:"blazephoenix", name:"sands"){ issue(number:$n){ subIssues(first:100){ nodes{ number title state assignees(first:1){ totalCount } blockedBy(first:50){ nodes{ state } } } } } } }' \
    --jq '.data.repository.issue.subIssues.nodes[] | select(.state=="OPEN" and .assignees.totalCount==0 and all(.blockedBy.nodes[]; .state=="CLOSED")) | "#\(.number) \(.title)"'
  ```

- **Resolve**: post the answer as a comment, close the ticket, and add a line to the map's "Decisions so far". A ticket whose work lands as a pull request closes through that pull request's `Closes #<n>`.
