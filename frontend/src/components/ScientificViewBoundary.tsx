import { Component } from 'react'
import type { ReactNode } from 'react'

export default class ScientificViewBoundary extends Component<{ children: ReactNode; onFailure?: () => void; onRecovery?: () => void }, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure?.() }
  render() {
    if (!this.state.failed) return <div className="view-boundary" key={this.state.attempt}>{this.props.children}</div>
    return <div className="fallback" role="alert">
      <h3>This view could not load</h3>
      <p>The local server may have stopped or its assets changed during a rebuild. Completed results, the other view, and exports remain available. Playback has paused.</p>
      <button type="button" onClick={() => { this.props.onRecovery?.(); this.setState(({ attempt }) => ({ failed: false, attempt: attempt + 1 })) }}>Retry this view</button>
    </div>
  }
}
