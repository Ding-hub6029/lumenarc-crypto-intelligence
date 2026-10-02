# PE6201 project hand-in checklist

The instructor's later course announcement sets the current final deadline at Sunday, October 4, 2026, 23:59 Singapore time. The older assessment timeline PDF lists September 20 for the project. Treat the later, explicit announcement as the updated instruction and verify the live NTULearn submission page before uploading.

## Files prepared in this package

- `docs/FINAL_REPORT.md` and `docs/FINAL_REPORT.pdf`, a structured English report near the course's 1,200-word target.
- `README.md`, runnable instructions for the React and Node prototype.
- `docs/PRODUCT.md`, `docs/PRODUCT.pdf`, and `docs/architecture.png`, covering persona, inputs, outputs, architecture, measured goals, and limitations.
- `data/manifest.csv`, a verified 30-report source list with exact original URLs, SHA256, page counts, and an import command.
- `data/dev_questions.jsonl` and `data/holdout_questions.jsonl`, disjoint development and final evaluation candidate labels with source-page quotations.
- `eval/FROZEN_CONFIG.json`, the configuration snapshot prepared before the formal holdout run.
- `eval/results/`, raw per-question predictions, evaluation summaries, and any interrupted-run log.
- `client/`, `server/`, `scripts/`, build configuration, tests, and the Dockerfile.
- `docs/DEMO_SCRIPT.md`, a suggested explanation for the required face-and-screen video.

## Actions the student must personally complete

1. Review the entire 50-question source-checked holdout and original pages manually before calling the answer key human verified. The machine-checked candidate labels must not be misrepresented.
2. Record a confident and articulate demo with your face and screen visible at the same time. Aim for approximately five minutes. The instructor says only the first eight minutes will be reviewed if a recording exceeds eight minutes. The included script is not the recording.
3. Put the working code and appropriate evaluation files in a GitHub repository if the course submission requires GitHub. Do not put the school OpenRouter key, protected environment files, original publisher PDFs, or complete report extracts into GitHub. A managed project checkpoint and a downloadable source package do not themselves create a GitHub repository.
4. Submit the report, repository link, video link or file, and other requested materials to the correct NTULearn assignment before the updated deadline. Confirm accepted upload types and any repository access settings on the actual submission page.
5. If the course insists on use of the school-provided OpenRouter key, finish the protected secret input flow and run a clearly labeled separate provider test. The current measured results use project AI because the protected key input was not confirmed. Never describe these scores as OpenRouter results.
6. Rotate the school API key after the project because it was pasted into a conversation. Do not copy it into report, code, or screenshots.

## Claims to avoid

Do not claim a measured 40 percent reduction in analyst compilation time. No timed human comparator was run. Do not call the categorical evidence state a calibrated confidence score. Do not say that all 50 labels were independently human verified. Do not say the live price panel predicts market direction. Do not say the AI read complete publisher articles when it saw only RSS headlines and excerpts.
