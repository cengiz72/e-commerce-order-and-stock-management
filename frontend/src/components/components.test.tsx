// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ChangeEvent, SyntheticEvent } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { DataTable } from './DataTable'
import type { DataTableColumn, DataTableProps } from './DataTable'
import { EmptyState } from './EmptyState'
import { Input } from './Input'
import { Modal } from './Modal'
import { Money } from './Money'
import { Select } from './Select'
import { Skeleton } from './Skeleton'
import { Spinner } from './Spinner'
import { StatusBadge } from './StatusBadge'
import { Toast } from './Toast'

/**
 * Behaviour of the shared design system. Every test drives a component the way a feature will —
 * props in, DOM out — and none of them mock anything, because there is nothing to mock: this
 * layer has no dependencies (see `layerBoundary.test.ts`).
 *
 * Queries go through roles/labels rather than class names so the assertions describe what a user
 * (or a screen reader) gets, not how it is styled.
 */

afterEach(cleanup)

describe('Button', () => {
  it('does not submit the surrounding form unless asked to', () => {
    // The native default is `type="submit"`; a design-system button that inherits it detonates
    // inside any form it is dropped into.
    const onSubmit = vi.fn((event: SyntheticEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button>Cancel</Button>
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits when the caller opts in', () => {
    const onSubmit = vi.fn((event: SyntheticEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('forwards native props and clicks', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} data-testid="cta" variant="danger">
        Delete
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button.className).toContain('ui-button--danger')
    expect(button.dataset.testid).toBe('cta')
  })

  it('blocks activation while loading and keeps its label', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Place order
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Place order' })
    fireEvent.click(button)

    expect(onClick).not.toHaveBeenCalled()
    expect(button).toHaveProperty('disabled', true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    // The spinner inside a labelled button is decorative — it must not announce itself.
    expect(within(button).queryByRole('status')).toBeNull()
  })
})

describe('Input', () => {
  it('associates its label with the control', () => {
    render(<Input id="email" label="Email" type="email" defaultValue="a@b.c" />)

    expect(screen.getByLabelText('Email')).toHaveProperty('value', 'a@b.c')
  })

  it('reports changes to the caller', () => {
    const onChange = vi.fn()
    render(<Input id="q" label="Search" value="" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'shoe' } })

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('wires hint and error to the control for assistive tech', () => {
    render(<Input id="qty" label="Quantity" hint="Whole numbers only" error="Too many" />)

    const input = screen.getByLabelText('Quantity')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('qty-hint qty-error')
    // A validation message that appears after submit has to be announced, not just shown.
    expect(screen.getByRole('alert').textContent).toBe('Too many')
  })

  it('is valid and undescribed when given neither hint nor error', () => {
    render(<Input id="name" label="Name" />)

    const input = screen.getByLabelText('Name')
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(input.getAttribute('aria-describedby')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('Select', () => {
  const CATEGORIES = [
    { value: 'cat-1', label: 'Shoes' },
    { value: 'cat-2', label: 'Hats', disabled: true },
  ]

  it('renders its options and reports the chosen value as an opaque string', () => {
    // Read inside the handler: the select is controlled with `value=""`, so React restores the
    // DOM value straight after the change and reading `target.value` afterwards would see ''.
    let chosen: string | undefined
    const onChange = vi.fn((event: ChangeEvent<HTMLSelectElement>) => {
      chosen = event.target.value
    })
    render(
      <Select
        id="category"
        label="Category"
        options={CATEGORIES}
        placeholder="All categories"
        value=""
        onChange={onChange}
      />,
    )

    const select = screen.getByLabelText('Category')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'All categories',
      'Shoes',
      'Hats',
    ])
    // The placeholder keeps "nothing chosen" distinguishable from a real category.
    expect(screen.getByRole('option', { name: 'All categories' })).toHaveProperty('value', '')
    expect(screen.getByRole('option', { name: 'Hats' })).toHaveProperty('disabled', true)

    fireEvent.change(select, { target: { value: 'cat-1' } })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(chosen).toBe('cat-1')
  })

  it('omits the placeholder when none is given', () => {
    render(<Select id="c" label="Category" options={CATEGORIES} />)

    expect(screen.getAllByRole('option')).toHaveLength(2)
  })
})

describe('Modal', () => {
  function renderModal(open: boolean, onClose = vi.fn()) {
    render(
      <Modal open={open} title="Confirm removal" onClose={onClose}>
        <p>Remove this item?</p>
      </Modal>,
    )
    return onClose
  }

  it('renders nothing while closed', () => {
    renderModal(false)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders a labelled modal dialog when open', () => {
    renderModal(true)

    const dialog = screen.getByRole('dialog', { name: 'Confirm removal' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(within(dialog).getByText('Remove this item?')).toBeTruthy()
    // Focus moves in, so the next Tab stays inside the dialog rather than behind it.
    expect(document.activeElement).toBe(dialog)
  })

  it('reports every dismissal path to its owner', () => {
    const onClose = renderModal(true)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closes on a backdrop click but not on a click inside the dialog', () => {
    const onClose = renderModal(true)
    const dialog = screen.getByRole('dialog')

    fireEvent.click(within(dialog).getByText('Remove this item?'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(dialog.parentElement as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stops listening for Escape once closed', () => {
    const onClose = vi.fn()
    const { rerender } = render(<Modal open title="Confirm" onClose={onClose} />)

    rerender(<Modal open={false} title="Confirm" onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('DataTable', () => {
  interface OrderLine {
    productId: string
    quantity: number
    unitPrice: string
  }

  const LINES: OrderLine[] = [
    { productId: 'SKU-1', quantity: 2, unitPrice: '19.99' },
    { productId: 'SKU-2', quantity: 1, unitPrice: '5.00' },
  ]

  const COLUMNS: Array<DataTableColumn<OrderLine>> = [
    { key: 'product', header: 'Product', cell: (line) => line.productId },
    { key: 'qty', header: 'Qty', cell: (line) => line.quantity, align: 'end' },
    {
      key: 'price',
      header: 'Unit price',
      align: 'end',
      cell: (line) => <Money amount={line.unitPrice} locale="en-US" />,
    },
  ]

  function renderTable(overrides: Partial<DataTableProps<OrderLine>> = {}) {
    return render(
      <DataTable
        columns={COLUMNS}
        rows={LINES}
        rowKey={(line) => line.productId}
        caption="Order lines"
        {...overrides}
      />,
    )
  }

  it('renders a row per item using the caller-supplied cell renderers', () => {
    renderTable()

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Product',
      'Qty',
      'Unit price',
    ])
    const rows = screen.getAllByRole('row')
    // Header row + one row per line.
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getByText('SKU-1')).toBeTruthy()
    // Formatting stays the caller's choice — the table renders whatever the cell returns.
    expect(within(rows[1]).getByText('$19.99')).toBeTruthy()
  })

  it('shows placeholder rows and marks itself busy while loading', () => {
    renderTable({ loading: true, skeletonRows: 2 })

    expect(screen.queryByText('SKU-1')).toBeNull()
    // 2 skeleton rows + header row.
    expect(screen.getAllByRole('row')).toHaveLength(3)
    const body = screen.getAllByRole('rowgroup')[1]
    expect(body.getAttribute('aria-busy')).toBe('true')
  })

  it('falls back to an empty state when there is nothing to show', () => {
    renderTable({ rows: [] })

    expect(screen.getByText('Nothing to show')).toBeTruthy()
  })

  it('lets the caller supply the empty state', () => {
    renderTable({ rows: [], empty: <EmptyState title="No orders yet" /> })

    expect(screen.getByText('No orders yet')).toBeTruthy()
  })

  it('does not claim to be empty while it is still loading', () => {
    renderTable({ rows: [], loading: true })

    expect(screen.queryByText('Nothing to show')).toBeNull()
  })
})

describe('Money (AC2)', () => {
  it('renders a formatted price from the backend decimal string', () => {
    render(<Money amount="19.99" locale="en-US" />)

    expect(screen.getByText('$19.99')).toBeTruthy()
  })

  it('keeps the exact backend value in the DOM alongside the formatted one', () => {
    const { container } = render(<Money amount="19.90" locale="en-US" />)

    const element = container.querySelector('data')
    expect(element?.getAttribute('value')).toBe('19.90')
    expect(element?.textContent).toBe('$19.90')
  })

  it('formats an amount no JS number could carry', () => {
    render(<Money amount="9007199254740993.45" locale="en-US" />)

    expect(screen.getByText('$9,007,199,254,740,993.45')).toBeTruthy()
  })

  it('honours currency and locale', () => {
    render(<Money amount="1234.5" currency="EUR" locale="de-DE" />)

    expect(screen.getByText('1.234,50 €')).toBeTruthy()
  })

  it('shows a fallback rather than a wrong price for an unusable amount', () => {
    const { rerender } = render(<Money amount="" locale="en-US" />)
    expect(screen.getByText('—')).toBeTruthy()

    rerender(<Money amount="not-a-price" locale="en-US" fallback="Unavailable" />)
    expect(screen.getByText('Unavailable')).toBeTruthy()
  })
})

describe('StatusBadge (AC3)', () => {
  it('renders a status the backend returned', () => {
    render(<StatusBadge status="STOCK_RESERVED" />)

    const badge = screen.getByText('Stock reserved')
    expect(badge.dataset.status).toBe('STOCK_RESERVED')
  })

  it('renders a status it has never heard of, unchanged in substance', () => {
    // The order lifecycle is server-owned and unfinished (postgre-schema.md OQ2). A status added
    // by the backend tomorrow must render today, in the neutral tone, without a code change.
    render(<StatusBadge status="AWAITING_WAREHOUSE_PICK" />)

    const badge = screen.getByText('Awaiting warehouse pick')
    expect(badge.dataset.status).toBe('AWAITING_WAREHOUSE_PICK')
    expect(badge.className).toContain('ui-status-badge--neutral')
  })

  it.each(['PENDING', 'STOCK_REJECTED', 'PAID', 'CANCELLED', 'SOMETHING_NEW', 'weird-value'])(
    'renders %s without special-casing it',
    (status) => {
      const { unmount } = render(<StatusBadge status={status} />)

      const badge = document.querySelector('[data-status]')
      expect(badge?.getAttribute('data-status')).toBe(status)
      expect(badge?.textContent).not.toBe('')
      expect(badge?.className).toContain('ui-status-badge--neutral')
      unmount()
    },
  )

  it('leaves already-readable text alone', () => {
    render(<StatusBadge status="Awaiting payment" />)

    expect(screen.getByText('Awaiting payment')).toBeTruthy()
  })

  it('lets a caller override the copy and the tone it knows the status deserves', () => {
    render(<StatusBadge status="PAID" label="Payment received" tone="success" />)

    const badge = screen.getByText('Payment received')
    expect(badge.dataset.status).toBe('PAID')
    expect(badge.className).toContain('ui-status-badge--success')
  })
})

describe('Spinner', () => {
  it('announces itself by default', () => {
    render(<Spinner />)

    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading')
  })

  it('can be made decorative when something else already says what is loading', () => {
    render(<Spinner label={null} size="lg" />)

    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('Skeleton', () => {
  it('renders the requested number of bars and stays out of the accessibility tree', () => {
    const { container } = render(<Skeleton lines={3} width="12ch" />)

    const root = container.firstElementChild
    expect(root?.getAttribute('aria-hidden')).toBe('true')
    expect(root?.querySelectorAll('.ui-skeleton__line')).toHaveLength(3)
  })
})

describe('EmptyState', () => {
  it('renders title, description and an action', () => {
    render(
      <EmptyState
        title="Your cart is empty"
        description="Add something to it."
        action={<Button>Browse products</Button>}
      />,
    )

    expect(screen.getByText('Your cart is empty')).toBeTruthy()
    expect(screen.getByText('Add something to it.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Browse products' })).toBeTruthy()
  })

  it('renders with a title alone', () => {
    render(<EmptyState title="No orders yet" />)

    expect(screen.getByText('No orders yet')).toBeTruthy()
  })
})

describe('Toast', () => {
  it('announces politely by default and urgently for errors', () => {
    const { unmount } = render(<Toast>Saved</Toast>)
    expect(screen.getByRole('status').textContent).toContain('Saved')
    unmount()

    render(<Toast tone="error">Payment failed</Toast>)
    expect(screen.getByRole('alert').textContent).toContain('Payment failed')
  })

  it('offers a dismiss button only when someone is listening', () => {
    const { unmount } = render(<Toast>Saved</Toast>)
    expect(screen.queryByRole('button')).toBeNull()
    unmount()

    const onDismiss = vi.fn()
    render(
      <Toast title="Order placed" onDismiss={onDismiss}>
        We are processing it.
      </Toast>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Order placed')).toBeTruthy()
  })

  it('auto-dismisses after the given duration', () => {
    vi.useFakeTimers()
    try {
      const onDismiss = vi.fn()
      render(
        <Toast duration={3000} onDismiss={onDismiss}>
          Saved
        </Toast>,
      )

      expect(onDismiss).not.toHaveBeenCalled()
      vi.advanceTimersByTime(3000)
      expect(onDismiss).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('stays put when no duration is given', () => {
    vi.useFakeTimers()
    try {
      const onDismiss = vi.fn()
      render(<Toast onDismiss={onDismiss}>Payment failed</Toast>)

      vi.advanceTimersByTime(60_000)

      expect(onDismiss).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
