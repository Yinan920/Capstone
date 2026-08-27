"""JobRunner abstraction.

Iteration 1 executes analysis jobs on FastAPI BackgroundTasks. Because the
pipeline only ever sees `enqueue(job_id)`, swapping to RQ/Redis later means
writing a new runner class — pipeline and API code stay untouched.
"""
import uuid
from typing import Protocol

from fastapi import BackgroundTasks

# Imported at module scope on purpose. This pulls in the pipeline and, with it,
# numpy and scikit-learn — several seconds of import work. Done lazily inside
# enqueue() that cost was paid *inside the first upload request* of every
# container (measured at ~10 s, docs/benchmarks.md). At module scope it lands in
# application import instead, where Cloud Run's startup probe absorbs it and no
# user request ever waits for it. There is no import cycle: the pipeline reaches
# down into db/models/integrations and never back up into app.api or app.workers.
from app.workers.tasks import run_analysis_job


class JobRunner(Protocol):
    def enqueue(self, background: BackgroundTasks, job_id: uuid.UUID) -> None: ...


class BackgroundTasksRunner:
    def enqueue(self, background: BackgroundTasks, job_id: uuid.UUID) -> None:
        background.add_task(run_analysis_job, job_id)


job_runner: JobRunner = BackgroundTasksRunner()
