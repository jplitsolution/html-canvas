import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import useStore from '../../store/useStore'
import Button from '../ui/Button'

export default class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    useStore.getState().logError(this.props.name || 'App', error)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
  }

  handleSafeMode = () => {
    useStore.getState().setSafeMode(true)
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-bg-base">
          <div className="max-w-md w-full glass rounded-xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-fg font-display mb-2">Something went wrong</h2>
            <p className="text-sm text-fg-muted mb-4">{this.state.error?.message}</p>
            <details className="text-left text-xs text-fg-subtle mb-6 max-h-32 overflow-auto">
              <summary className="cursor-pointer mb-1">Diagnostics</summary>
              <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
            </details>
            <div className="flex gap-3 justify-center">
              <Button variant="primary" onClick={this.handleReload}>
                <RefreshCw className="w-4 h-4" /> Reload
              </Button>
              <Button variant="outline" onClick={this.handleSafeMode}>
                Safe Mode
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
