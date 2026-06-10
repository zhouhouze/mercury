# B Debug Renderer Integration Boundary

## Consumes

- Runtime status.
- PageContext status.
- unknown events.
- trace snippets.
- tool failures.

## Produces

- Debug presentation state.

## Stop Conditions

Stop if Debug Renderer needs:

- backend trace schema changes.
- full page body logging.
- direct Runtime mutation.
- new public event types.

