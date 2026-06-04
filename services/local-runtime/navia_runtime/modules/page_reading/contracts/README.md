# A Contracts

Module-local contracts must stay compatible with `docs/navia_v1_project_docs/contracts/v1_2_adapter_contracts.md`.

Allowed local refinements:

- Parser input helpers.
- Fixture output shape.
- Internal annotation rule metadata.

Not allowed locally:

- Redefining `StructuredPageContext`.
- Adding public fields without V1.2-0 review.
- Changing `PageChunk`, `ParagraphBlock`, or `ParagraphAnnotation` semantics.

