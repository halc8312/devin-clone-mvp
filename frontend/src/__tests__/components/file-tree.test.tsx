import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileTree } from '@/components/file-tree'
import { filesApi } from '@/lib/api'
import type { ProjectFileTree } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  filesApi: {
    getTree: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
}))

const mockFileTree: ProjectFileTree[] = [
  {
    id: '1',
    project_id: 'proj-1',
    name: 'src',
    path: '/src',
    type: 'directory',
    size_bytes: 0,
    is_binary: false,
    encoding: 'utf-8',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    children: [
      {
        id: '2',
        project_id: 'proj-1',
        parent_id: '1',
        name: 'index.ts',
        path: '/src/index.ts',
        type: 'file',
        content: 'console.log("hello")',
        language: 'typescript',
        size_bytes: 20,
        is_binary: false,
        encoding: 'utf-8',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        children: [],
      },
    ],
  },
  {
    id: '3',
    project_id: 'proj-1',
    name: 'README.md',
    path: '/README.md',
    type: 'file',
    content: '# Project',
    language: 'markdown',
    size_bytes: 9,
    is_binary: false,
    encoding: 'utf-8',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    children: [],
  },
]

describe('FileTree', () => {
  const mockOnFileSelect = jest.fn()
  const mockOnRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(filesApi.getTree as jest.Mock).mockResolvedValue(mockFileTree)
  })

  it('renders file tree structure', async () => {
    render(
      <FileTree
        projectId="proj-1"
        selectedFileId="2"
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument()
      expect(screen.getByText('README.md')).toBeInTheDocument()
    })
  })

  it('expands and collapses directories', async () => {
    const user = userEvent.setup()
    
    render(
      <FileTree
        projectId="proj-1"
        selectedFileId="2"
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument()
    })

    // Initially, src directory should be expanded (selected file is inside)
    expect(screen.getByText('index.ts')).toBeInTheDocument()

    // Click to collapse
    const srcFolder = screen.getByText('src')
    await user.click(srcFolder)

    // index.ts should be hidden
    expect(screen.queryByText('index.ts')).not.toBeInTheDocument()

    // Click to expand again
    await user.click(srcFolder)

    // index.ts should be visible again
    expect(screen.getByText('index.ts')).toBeInTheDocument()
  })

  it('selects files on click', async () => {
    const user = userEvent.setup()
    
    render(
      <FileTree
        projectId="proj-1"
        selectedFileId="2"
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument()
    })

    // Click on README.md
    const readmeFile = screen.getByText('README.md')
    await user.click(readmeFile)

    expect(mockOnFileSelect).toHaveBeenCalledWith('3')
  })

  it('shows context menu on right click', async () => {
    const user = userEvent.setup()
    
    render(
      <FileTree
        projectId="proj-1"
        selectedFileId="2"
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument()
    })

    // Right click on file
    const readmeFile = screen.getByText('README.md')
    fireEvent.contextMenu(readmeFile)

    // Context menu should appear
    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('creates new file', async () => {
    const user = userEvent.setup()
    ;(filesApi.create as jest.Mock).mockResolvedValue({
      id: '4',
      name: 'new-file.ts',
      type: 'file',
    })
    
    render(
      <FileTree
        projectId="proj-1"
        selectedFileId="2"
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Create new file')).toBeInTheDocument()
    })

    // Click new file button
    const newFileButton = screen.getByLabelText('Create new file')
    await user.click(newFileButton)

    // Enter file name
    const input = screen.getByPlaceholderText(/new file name/i)
    await user.type(input, 'new-file.ts')
    await user.keyboard('{Enter}')

    // Verify API was called
    expect(filesApi.create).toHaveBeenCalledWith('proj-1', {
      name: 'new-file.ts',
      path: '/new-file.ts',
      type: 'file',
      content: '',
    })

    // Verify refresh was called
    expect(mockOnRefresh).toHaveBeenCalled()
  })

  it('deletes file with confirmation', async () => {
    const user = userEvent.setup()
    window.confirm = jest.fn(() => true)
    ;(filesApi.delete as jest.Mock).mockResolvedValue({ message: 'Deleted' })
    
    render(
      <FileTree
        projectId="proj-1"
        selectedFileId="2"
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument()
    })

    // Right click and delete
    const readmeFile = screen.getByText('README.md')
    fireEvent.contextMenu(readmeFile)
    
    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    // Verify confirmation was shown
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete README.md?')

    // Verify API was called
    expect(filesApi.delete).toHaveBeenCalledWith('proj-1', '3')

    // Verify refresh was called
    expect(mockOnRefresh).toHaveBeenCalled()
  })

  it('handles loading state', () => {
    render(
      <FileTree
        projectId="proj-1"
        selectedFileId="2"
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
        loading
      />
    )

    expect(screen.getByTestId('file-tree-skeleton')).toBeInTheDocument()
  })

  it('handles error state', async () => {
    ;(filesApi.getTree as jest.Mock).mockRejectedValue(new Error('Failed to load'))
    
    render(
      <FileTree
        projectId="proj-1"
        selectedFileId="2"
        onFileSelect={mockOnFileSelect}
        onRefresh={mockOnRefresh}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })
})