# Catalyst Connect — Document Upload Experience

**Status:** Implemented locally · Programme **CO-WP-UPLOAD-001**  
**Builds on:** CO-WP-LOD-001

## Included

- Drag & drop (photos / PDFs)
- Mobile camera (`capture="environment"`)
- Gallery / files picker
- Multi-file queue (append pages for the same LOD type)
- Upload progress (XHR)
- Success animation
- Retry failed uploads
- Replace existing document

## Excluded (by design)

- Folder selection
- Manual categorisation
- Manual tagging

Uploads always bind to Enterprise LOD `typeRef` from Catalyst One.
