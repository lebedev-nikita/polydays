# Polydays

Polydays organises personal tasks around recurring intervals of wakefulness in a polyphasic sleep schedule.

## Language

**Polyday (полидень)**:
An interval of wakefulness between two sleeps, with its own task list and boundaries defined by the user's daily sleep schedule; it may cross midnight and is identified to the user by its start date and name.
_Avoid_: Mini-day, period, calendar day

**Polyday schedule (расписание полидней)**:
The user-defined, named, non-overlapping intervals of polydays repeated daily according to a stable sleep schedule, with sleep gaps between them.
_Avoid_: Periods

**Current polyday (текущий полидень)**:
The polyday shown by default for the present moment: the containing polyday during wakefulness, or the upcoming polyday during a scheduled sleep gap.
_Avoid_: Previous polyday during sleep

**Scheduled task (запланированная задача)**:
A task associated with a polyday either by explicit selection when untimed or by its exact deadline.
_Avoid_: Calendar event

**Untimed task (задача без точного дедлайна)**:
A task whose polyday can be selected explicitly, or which remains in the backlog until scheduled.
_Avoid_: Task with an implicit exact deadline

**Deadline task (задача с точным дедлайном)**:
A task with an exact deadline date and time that determine its polyday; it cannot independently be moved to a selected polyday.
_Avoid_: Task with both a fixed polyday and an independent deadline

**Deadline (дедлайн)**:
The optional exact date and time by which a task should be completed; an unfinished task becomes overdue after it passes, and early completion is allowed.
_Avoid_: Planned start, start time

**Rescheduling (перенос задачи)**:
Selecting another polyday for an untimed task, or editing the explicit deadline date and time of a deadline task so its polyday is recalculated.
_Avoid_: Moving a deadline task to a polyday

**Overdue task (просроченная задача)**:
An unfinished task whose exact deadline has passed, or whose assigned polyday has ended when no exact deadline is set; it remains assigned to that polyday and is also visible in the current polyday.
_Avoid_: Automatically moved task, copied task

**Recurring task series (серия повторяющихся задач)**:
A task definition and recurrence rule whose repetitions are individual task occurrences.
_Avoid_: Single task with a resetting checkbox

**Task occurrence (повторение задачи)**:
One repetition of a recurring task series, with its own assigned polyday and completion state.
_Avoid_: Group of missed repetitions

**Backlog (бэклог)**:
The collection of tasks with neither an explicitly assigned polyday nor an exact deadline.
_Avoid_: Incoming list, someday list

**Polyday history (история полидней)**:
The record of past polydays and their assigned tasks; a completed task is recorded in its assigned polyday even if completed earlier or later.
_Avoid_: Productivity score, usefulness assessment

**Account timezone (часовой пояс аккаунта)**:
The single active timezone governing the user's schedule on every device, either fixed or changed after confirming a detected local timezone change.
_Avoid_: Independent device timezone
