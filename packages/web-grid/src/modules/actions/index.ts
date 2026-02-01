// =============================================================================
// Actions Module - Event Pipeline for Grid
// =============================================================================

// Types
export type {
	CellCoordinates,
	NavigationDirection,
	FocusCellAction,
	BlurCellAction,
	StartEditAction,
	CommitEditAction,
	CancelEditAction,
	SelectCellRangeAction,
	ClearSelectionAction,
	NavigateAction,
	OpenDropdownAction,
	CloseDropdownAction,
	ToggleDropdownAction,
	DropdownNavigateAction,
	DropdownSelectAction,
	OpenDatePickerAction,
	CloseDatePickerAction,
	RenderCellAction,
	TransitionCellAction,
	GridAction
} from './types.js'

// Pipeline
export { ActionPipeline, createActionPipeline } from './pipeline.js'
export type { ExecutorContext, ActionExecutor } from './pipeline.js'

// Adapter
export { ActionPipelineAdapter, createActionPipelineAdapter } from './adapter.js'

// Event mapper
export { mapKeyDownToAction, mapMouseDownToActions, isPipelineKey, isNavigationKey } from './event-mapper.js'
export type { EventMapperContext, MouseMapperContext } from './event-mapper.js'

// Executors (exported for testing or extension)
export { focusExecutor } from './executors/focus-executor.js'
export { navigateExecutor } from './executors/navigate-executor.js'
export { transitionExecutor } from './executors/transition-executor.js'
export { renderExecutor } from './executors/render-executor.js'
export { dropdownExecutor } from './executors/dropdown-executor.js'
