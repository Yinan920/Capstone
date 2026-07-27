"""JobRunner abstraction.

Iteration 1 executes analysis jobs on FastAPI BackgroundTasks. Because the
pipeline only ever sees `enqueue(job_id)`, swapping to RQ/Redis later means
writing a new runner class — pipeline and API code stay untouched.
"""
import uuid
from typing import Protocol

from fastapi import BackgroundTasks


class JobRunner(Protocol):
    def enqueue(self, background: BackgroundTasks, job_id: uuid.UUID) -> None: ...


class BackgroundTasksRunner:
    def enqueue(self, background: BackgroundTasks, job_id: uuid.UUID) -> None:
        from app.workers.tasks import run_analysis_job

        background.add_task(run_analysis_job, job_id)


job_runner: JobRunner = BackgroundTasksRunner()
