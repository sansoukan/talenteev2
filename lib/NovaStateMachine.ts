// /src/lib/NovaStateMachine.ts
export type NovaState =
  | "INIT"
  | "INTRO_1"
  | "INTRO_2"
  | "Q1_WAIT"
  | "QUESTION"
  | "IDLE"
  | "RELANCE"
  | "END_FEEDBACK"

const TRANSITIONS: Record<NovaState, NovaState[]> = {
  INIT: ["INTRO_1"],
  INTRO_1: ["INTRO_2"],
  INTRO_2: ["Q1_WAIT"],
  Q1_WAIT: ["QUESTION"],
  QUESTION: ["IDLE", "END_FEEDBACK"],
  IDLE: ["RELANCE", "QUESTION", "END_FEEDBACK"],
  RELANCE: ["QUESTION", "END_FEEDBACK"],
  END_FEEDBACK: []
}

export class NovaStateMachine {
  private state: NovaState = "INIT"

  get current() {
    return this.state
  }

  is(s: NovaState) {
    return this.state === s
  }

  can(next: NovaState) {
    return TRANSITIONS[this.state].includes(next)
  }

  transition(next: NovaState) {
    if (!this.can(next)) {
      console.warn(
        `⛔ FSM BLOCKED — transition interdite : ${this.state} → ${next}`
      )
      return false
    }
    console.log(`✅ FSM: ${this.state} → ${next}`)
    this.state = next
    return true
  }
}