import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Container,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  Checkbox,
  Modal,
  Fade,
  Backdrop,
  TextField,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemText,
  CssBaseline,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SearchIcon from '@mui/icons-material/Search';
import { DndContext, rectIntersection, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const App = () => {
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState('');
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [firstSelectedStatus, setFirstSelectedStatus] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [taskDetails, setTaskDetails] = useState(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editedTask, setEditedTask] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddSprintOpen, setIsAddSprintOpen] = useState(false);
  const [isEditSprintOpen, setIsEditSprintOpen] = useState(false);
  const [isFilterTasksOpen, setIsFilterTasksOpen] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: '',
    sprint: '',
    status: 'Planning',
    priority: 'low',
  });
  const [newSprint, setNewSprint] = useState({
    name: '',
    status: 'Pending',
    endDate: '',
    startDate: '',
  });
  const [editSprint, setEditSprint] = useState(null);
  const [users, setUsers] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [activeTask, setActiveTask] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxColumnHeight, setMaxColumnHeight] = useState(0);

  const columnRefs = {
    Planning: useRef(null),
    Execution: useRef(null),
    Review: useRef(null),
  };

  const customCollisionDetection = rectIntersection;

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }
    try {
      const response = await axiosWithAuth.post('/login', { username, password });
      if (response.data.token) {
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        setIsLoggedIn(true);
        setUserRole(response.data.role || 'employee');
        setUsername(username);
        toast.success('Logged in successfully');
      } else {
        setLoginError('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      setLoginError('Invalid credentials');
    }
  };

  const axiosWithAuth = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    headers: token ? { Authorization: token } : {},
  });

  useEffect(() => {
    if (isLoggedIn && token) {
      const fetchUsers = async () => {
        try {
          const response = await axiosWithAuth.get('/users');
          setUsers(response.data);
        } catch (error) {
          console.error('Error fetching users:', error.response?.data || error.message);
          toast.error('Error fetching users');
        }
      };
      fetchUsers();
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (isLoggedIn && token) {
      const fetchSprints = async () => {
        setIsLoading(true);
        try {
          const response = await axiosWithAuth.get('/sprints');
          const filteredSprints = response.data
            .filter((sprint) => sprint.status !== 'Completed')
            .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
          setSprints(filteredSprints);
          if (filteredSprints.length > 0) setSelectedSprint(filteredSprints[0]._id);
          else toast.warn('No active sprints available. Please create a sprint.');
        } catch (error) {
          console.error('Error fetching sprints:', error.response?.data || error.message);
          toast.error('Error fetching sprints');
        } finally {
          setIsLoading(false);
        }
      };
      fetchSprints();
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (selectedSprint && token) {
      const fetchTasks = async () => {
        setIsLoading(true);
        try {
          const response = await axiosWithAuth.get('/tasks');
          const sprintTasks = response.data.filter((task) => task.sprint._id === selectedSprint);
          setTasks(sprintTasks);
          setFilteredTasks(sprintTasks);
          setSelectedTasks([]);
          setFirstSelectedStatus(null);
          setSearchQuery('');
        } catch (error) {
          console.error('Error fetching tasks:', error.response?.data || error.message);
          toast.error('Error fetching tasks');
        } finally {
          setIsLoading(false);
        }
      };
      fetchTasks();
    }
  }, [selectedSprint, token]);

  useEffect(() => {
    setNewTask((prev) => ({ ...prev, sprint: selectedSprint }));
  }, [selectedSprint]);

  useEffect(() => {
    const heights = Object.keys(columnRefs).map(key => columnRefs[key].current?.scrollHeight || 0);
    const maxHeight = Math.max(...heights);
    setMaxColumnHeight(maxHeight);
  }, [filteredTasks]);

  const handleFilterTasks = () => {
    let updatedTasks = tasks;
    if (filterAssignee) {
      updatedTasks = updatedTasks.filter((task) => task.assignedTo.username === filterAssignee);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      updatedTasks = updatedTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.assignedTo.username.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
      );
    }
    setFilteredTasks(updatedTasks);
    setIsFilterTasksOpen(false);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    let updatedTasks = tasks;
    if (filterAssignee) {
      updatedTasks = updatedTasks.filter((task) => task.assignedTo.username === filterAssignee);
    }
    if (query) {
      const lowerQuery = query.toLowerCase();
      updatedTasks = updatedTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(lowerQuery) ||
          task.assignedTo.username.toLowerCase().includes(lowerQuery) ||
          (task.description && task.description.toLowerCase().includes(lowerQuery))
      );
    }
    setFilteredTasks(updatedTasks);
  };

  const handleTaskSelect = (taskId, status) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter((id) => id !== taskId));
      if (selectedTasks.length === 1) setFirstSelectedStatus(null);
    } else {
      if (selectedTasks.length === 0) {
        setFirstSelectedStatus(status);
        setSelectedTasks([taskId]);
      } else if (status === firstSelectedStatus) {
        setSelectedTasks([...selectedTasks, taskId]);
      } else {
        toast.warn('Select tasks in the same category as the first one');
      }
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const activeTask = filteredTasks.find((task) => task._id === active.id);
    setActiveTask(activeTask);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (selectedTasks.includes(activeId)) {
      toast.error('Cannot move task while selected for bulk update');
      return;
    }
    const activeTask = filteredTasks.find((task) => task._id === activeId);
    if (!activeTask) return;
    const sourceColumn = activeTask.status;
    let destinationColumn = sourceColumn;
    if (overId.startsWith('column-')) {
      destinationColumn = overId.replace('column-', '');
    } else {
      const overTask = filteredTasks.find((task) => task._id === overId);
      if (overTask) destinationColumn = overTask.status;
    }
    if (sourceColumn === destinationColumn) {
      const columnTasks = filteredTasks.filter((task) => task.status === sourceColumn);
      const oldIndex = columnTasks.findIndex((task) => task._id === activeId);
      const newIndex = overId.startsWith('column-')
        ? columnTasks.length
        : columnTasks.findIndex((task) => task._id === overId);
      if (oldIndex === newIndex) return;
      const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);
      const updatedTasks = filteredTasks.filter((task) => task.status !== sourceColumn).concat(reorderedTasks);
      setFilteredTasks(updatedTasks);
      setTasks(updatedTasks);
    } else {
      try {
        const response = await axiosWithAuth.post('/tasks/batch-update', {
          taskIds: [activeId],
          newStatus: destinationColumn,
        });
        toast.success('Task moved successfully');
        const sprintTasks = response.data.filter((task) => task.sprint._id === selectedSprint);
        setTasks(sprintTasks);
        setFilteredTasks(filterAssignee ? sprintTasks.filter((task) => task.assignedTo.username === filterAssignee) : sprintTasks);
      } catch (error) {
        console.error('Error moving task:', error.response?.data || error.message);
        toast.error('Error moving task');
      }
    }
  };

  const SortableTask = ({ task, index, column, handleTaskClick, handleTaskSelect, selectedTasks, firstSelectedStatus }) => {
    const isSelected = selectedTasks.includes(task._id);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task._id,
      data: { column },
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1,
      backgroundColor: isDragging ? '#e0f7fa' : '#fff',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '8px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      marginBottom: '12px',
    };
    const priorityColor = {
      high: '#ff4444',
      medium: '#ffbb33',
      low: '#00cc00',
    }[task.priority] || '#00cc00';
    return (
      <Box
        ref={setNodeRef}
        style={style}
        className="task-card"
        onClick={(event) => handleTaskClick(event, task)}
        role="article"
        aria-label={`Task: ${task.title}`}
        sx={{ position: 'relative' }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: priorityColor,
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', padding: '8px' }}>
          <IconButton
            className="drag-handle"
            {...listeners}
            {...attributes}
            sx={{ cursor: isSelected ? 'not-allowed' : 'grab', marginRight: '8px', flexShrink: 0 }}
          >
            <DragIndicatorIcon />
          </IconButton>
          {column !== 'Review' && (
            <Checkbox
              checked={isSelected}
              onChange={(event) => {
                event.stopPropagation();
                handleTaskSelect(task._id, task.status);
              }}
              disabled={selectedTasks.length > 0 && firstSelectedStatus !== task.status}
              inputProps={{ 'aria-label': `Select task ${task.title}` }}
              sx={{ marginRight: '8px', flexShrink: 0 }}
            />
          )}
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <Typography
              variant="subtitle1"
              sx={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {task.title}
            </Typography>
            <Typography variant="caption">Assigned to: {task.assignedTo.username}</Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  const DroppableColumn = ({ column, children }) => {
    const { setNodeRef, isOver } = useDroppable({ id: `column-${column}`, data: { column } });
    return (
      <Box
        ref={(node) => {
          setNodeRef(node);
          columnRefs[column].current = node;
        }}
        sx={{ height: maxColumnHeight ? `${maxColumnHeight}px` : 'auto' }}
        className={`task-column ${isOver ? 'drag-over' : ''}`}
      >
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium', textAlign: 'center' }}>
          {column}
        </Typography>
        <Box className="droppable-area">{children}</Box>
      </Box>
    );
  };

  const handleOpenModal = () => {
    if (selectedTasks.length === 0) {
      toast.warn('Please select at least one task');
      return;
    }
    if (firstSelectedStatus === 'Review') {
      toast.warn('Tasks in Review cannot be moved');
      return;
    }
    setBatchStatus('');
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setBatchStatus('');
    setIsUpdating(false);
  };

  const handleBatchUpdate = async () => {
    if (!batchStatus) {
      toast.error('Please select a new status');
      return;
    }
    setIsUpdating(true);
    try {
      const response = await axiosWithAuth.post('/tasks/batch-update', {
        taskIds: selectedTasks,
        newStatus: batchStatus,
      });
      toast.success('Tasks updated successfully');
      const sprintTasks = response.data.filter((task) => task.sprint._id === selectedSprint);
      setTasks(sprintTasks);
      setFilteredTasks(filterAssignee ? sprintTasks.filter((task) => task.assignedTo.username === filterAssignee) : sprintTasks);
      setSelectedTasks([]);
      setFirstSelectedStatus(null);
      handleCloseModal();
    } catch (error) {
      console.error('Error updating tasks:', error.response?.data || error.message);
      toast.error('Error updating tasks');
      setIsUpdating(false);
    }
  };

  const handleTaskClick = (event, task) => {
    if (event.target.type !== 'checkbox' && !event.target.closest('.drag-handle')) {
      setTaskDetails(task);
      setEditedTask({ ...task });
    }
  };

  const handleEditTask = () => {
    setIsEditingTask(true);
  };

  const handleSaveEdit = async () => {
    setConfirmOpen(true);
  };

  const confirmSaveEdit = async () => {
    try {
      const assigneeId = users.find((user) => user.username === editedTask.assignedTo.username)?._id;
      if (!assigneeId) {
        toast.error('Invalid assignee');
        return;
      }
      await axiosWithAuth.put(`/tasks/${editedTask._id}`, {
        ...editedTask,
        assignedTo: assigneeId,
      });
      toast.success('Task updated successfully');
      const response = await axiosWithAuth.get('/tasks');
      const sprintTasks = response.data.filter((task) => task.sprint._id === selectedSprint);
      setTasks(sprintTasks);
      setFilteredTasks(filterAssignee ? sprintTasks.filter((task) => task.assignedTo.username === filterAssignee) : sprintTasks);
      setTaskDetails(null);
      setIsEditingTask(false);
      setConfirmOpen(false);
    } catch (error) {
      console.error('Error updating task:', error.response?.data || error.message);
      toast.error('Error updating task');
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.assignee) {
      toast.error('Title and assignee are required');
      return;
    }
    try {
      const assigneeId = users.find((user) => user.username === newTask.assignee)?._id;
      if (!assigneeId) {
        toast.error('Invalid assignee');
        return;
      }
      const response = await axiosWithAuth.post('/tasks', {
        ...newTask,
        sprint: selectedSprint,
        assignedTo: assigneeId,
      });
      toast.success('Task added successfully');
      setIsAddTaskOpen(false);
      setNewTask({ title: '', description: '', assignee: username, sprint: selectedSprint, status: 'Planning', priority: 'low' });
      const tasksResponse = await axiosWithAuth.get('/tasks');
      const sprintTasks = tasksResponse.data.filter((task) => task.sprint._id === selectedSprint);
      setTasks(sprintTasks);
      setFilteredTasks(filterAssignee ? sprintTasks.filter((task) => task.assignedTo.username === filterAssignee) : sprintTasks);
    } catch (error) {
      console.error('Error adding task:', error.response?.data || error.message);
      toast.error('Error adding task');
    }
  };

  const handleAddSprint = async () => {
    if (!newSprint.name || !newSprint.startDate || !newSprint.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const response = await axiosWithAuth.post('/sprints', newSprint);
      toast.success('Sprint created successfully');
      const sprintsResponse = await axiosWithAuth.get('/sprints');
      const filteredSprints = sprintsResponse.data
        .filter((sprint) => sprint.status !== 'Completed')
        .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
      setSprints(filteredSprints);
      setNewSprint({ name: '', status: 'Pending', endDate: '', startDate: '' });
      setIsAddSprintOpen(false);
    } catch (error) {
      console.error('Error creating sprint:', error.response?.data || error.message);
      toast.error('Error creating sprint');
    }
  };

  const handleEditSprint = async () => {
    if (!editSprint.name || !editSprint.startDate || !editSprint.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const response = await axiosWithAuth.put(`/sprints/${selectedSprint}`, editSprint);
      toast.success('Sprint updated successfully');
      const sprintsResponse = await axiosWithAuth.get('/sprints');
      const filteredSprints = sprintsResponse.data
        .filter((sprint) => sprint.status !== 'Completed')
        .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
      setSprints(filteredSprints);
      setIsEditSprintOpen(false);
    } catch (error) {
      console.error('Error updating sprint:', error.response?.data || error.message);
      toast.error('Error updating sprint');
    }
  };

  const openEditSprintModal = () => {
    const currentSprint = sprints.find((sprint) => sprint._id === selectedSprint);
    if (currentSprint) {
      setEditSprint({
        name: currentSprint.name,
        status: currentSprint.status,
        startDate: currentSprint.startDate ? currentSprint.startDate.split('T')[0] : '',
        endDate: currentSprint.endDate ? currentSprint.endDate.split('T')[0] : '',
      });
      setIsEditSprintOpen(true);
    }
  };

  if (!isLoggedIn) {
    return (
      <Box sx={{ height: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f4f4f4' }}>
        <Box sx={{ width: 400, p: 4, bgcolor: 'white', borderRadius: 2, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>TaskApp</Typography>
          <TextField label="Username" variant="outlined" fullWidth sx={{ mb: 2 }} value={username} onChange={(e) => setUsername(e.target.value)} inputProps={{ 'aria-label': 'Username' }} />
          <TextField label="Password" type="password" variant="outlined" fullWidth sx={{ mb: 3 }} value={password} onChange={(e) => setPassword(e.target.value)} inputProps={{ 'aria-label': 'Password' }} />
          {loginError && <Typography color="error" sx={{ mb: 2 }}>{loginError}</Typography>}
          <Button variant="contained" color="primary" fullWidth onClick={handleLogin} sx={{ py: 1.5, fontSize: '1rem', bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}>Log In</Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <ToastContainer />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#1976d2' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>TaskApp</Typography>
          <Button color="inherit" onClick={() => setIsLoggedIn(false)}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: 240, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box', bgcolor: '#fafafa' } }}>
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem button selected sx={{ bgcolor: '#e0e0e0' }}><ListItemText primary="Task Board" /></ListItem>
            <ListItem button onClick={() => setIsSettingsOpen(true)}><ListItemText primary="Settings" /></ListItem>
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 5, bgcolor: '#f4f4f4', minHeight: '100vh' }}>
        <Toolbar />
        <Container maxWidth="lg">
          <Box sx={{ position: 'sticky', top: '64px', bgcolor: '#f4f4f4', zIndex: 1, pb: 2 }}>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>Welcome to TaskApp</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Sprint</InputLabel>
              <Select value={selectedSprint} onChange={(e) => setSelectedSprint(e.target.value)} label="Select Sprint" inputProps={{ 'aria-label': 'Select Sprint' }}>
                {sprints.map((sprint) => (
                  <MenuItem key={sprint._id} value={sprint._id}>{sprint.name} ({sprint.status}) - End: {new Date(sprint.endDate).toLocaleDateString()}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <TextField
                variant="outlined"
                placeholder="Search tasks by title, assignee, or description"
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{ startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} /> }}
                sx={{ width: '50%', bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#1976d2' }, '&:hover fieldset': { borderColor: '#1565c0' }, '&.Mui-focused fieldset': { borderColor: '#1976d2' } } }}
                inputProps={{ 'aria-label': 'Search Tasks' }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
              <Tooltip title="Filter tasks by assignee"><Button variant="contained" color="primary" onClick={() => setIsFilterTasksOpen(true)} sx={{ px: 3, py: 1, bgcolor: '#1976d2' }}>Filter Tasks</Button></Tooltip>
              <Tooltip title="Add a new task"><Button variant="contained" color="primary" onClick={() => { setNewTask({ ...newTask, assignee: username }); setIsAddTaskOpen(true); }} sx={{ px: 3, py: 1, bgcolor: '#1976d2' }}>Add Task</Button></Tooltip>
              {userRole === 'manager' && (
                <>
                  <Tooltip title="Add a new sprint"><Button variant="contained" color="primary" onClick={() => setIsAddSprintOpen(true)} sx={{ px: 3, py: 1, bgcolor: '#1976d2' }}>Add Sprint</Button></Tooltip>
                  <Tooltip title="Edit the current sprint"><Button variant="contained" color="primary" onClick={openEditSprintModal} sx={{ px: 3, py: 1, bgcolor: '#1976d2' }}>Edit Sprint</Button></Tooltip>
                  <Tooltip title={tasks.every(task => task.status === 'Review') ? '' : 'all tasks must be in review'}>
                    <span>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={async () => {
                          if (tasks.every(task => task.status === 'Review')) {
                            try {
                              const sprint = sprints.find(s => s._id === selectedSprint);
                              await axiosWithAuth.put(`/sprints/${selectedSprint}`, { ...sprint, status: 'Completed' });
                              const sprintsResponse = await axiosWithAuth.get('/sprints');
                              const filteredSprints = sprintsResponse.data.filter(s => s.status !== 'Completed').sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
                              setSprints(filteredSprints);
                              if (filteredSprints.length > 0) setSelectedSprint(filteredSprints[0]._id);
                              toast.success('Sprint ended successfully');
                            } catch (error) {
                              console.error('Error ending sprint:', error);
                              toast.error('Error ending sprint');
                            }
                          }
                        }}
                        disabled={!tasks.every(task => task.status === 'Review')}
                        sx={{ px: 3, py: 1, bgcolor: tasks.every(task => task.status === 'Review') ? '#1976d2' : '#d3d3d3', '&:hover': { bgcolor: tasks.every(task => task.status === 'Review') ? '#1565c0' : '#d3d3d3' } }}
                      >
                        End Sprint
                      </Button>
                    </span>
                  </Tooltip>
                </>
              )}
              <Tooltip title="Select tasks and update their status in bulk"><Button variant="contained" color="primary" onClick={handleOpenModal} sx={{ px: 3, py: 1, bgcolor: '#1976d2' }}>Bulk Update ({selectedTasks.length} selected)</Button></Tooltip>
            </Box>
          </Box>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
          ) : sprints.length === 0 ? (
            <Typography variant="h6" sx={{ textAlign: 'center', mt: 4 }}>No active sprints available. Please create a sprint.</Typography>
          ) : (
            <Box className="task-sections">
              <DndContext collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <Grid container spacing={4} justifyContent="center" sx={{ pt: 0, alignItems: 'flex-start' }}>
                  {['Planning', 'Execution', 'Review'].map((status) => (
                    <Grid item xs={12} sm={4} key={status}>
                      <DroppableColumn column={status}>
                        <SortableContext id={status} items={filteredTasks.filter((task) => task.status === status).map((task) => task._id)} strategy={verticalListSortingStrategy}>
                          {filteredTasks.filter((task) => task.status === status).map((task, index) => (
                            <SortableTask
                              key={task._id}
                              task={task}
                              index={index}
                              column={status}
                              handleTaskClick={handleTaskClick}
                              handleTaskSelect={handleTaskSelect}
                              selectedTasks={selectedTasks}
                              firstSelectedStatus={firstSelectedStatus}
                            />
                          ))}
                        </SortableContext>
                        {filteredTasks.filter((task) => task.status === status).length === 0 && <Box className="empty-column-placeholder" />}
                      </DroppableColumn>
                    </Grid>
                  ))}
                </Grid>
                <DragOverlay>
                  {activeTask ? (
                    <Box className="task-card dragging">
                      <Box sx={{ display: 'flex', alignItems: 'center', padding: '8px' }}>
                        <IconButton className="drag-handle" sx={{ cursor: 'grabbing', marginRight: '8px', flexShrink: 0 }}>
                          <DragIndicatorIcon />
                        </IconButton>
                        {activeTask.status !== 'Review' && <Checkbox checked={selectedTasks.includes(activeTask._id)} disabled />}
                        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%',
                            }}
                          >
                            {activeTask.title}
                          </Typography>
                          <Typography variant="caption">Assigned to: {activeTask.assignedTo.username}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Box>
          )}
          <Modal open={!!taskDetails} onClose={() => { setTaskDetails(null); setIsEditingTask(false); }} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
            <Fade in={!!taskDetails}>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'white', borderRadius: 2, boxShadow: 24, p: 4 }}>
                {taskDetails && (
                  <>
                    {isEditingTask ? (
                      <>
                        <Typography variant="h6">Edit Task</Typography>
                        <TextField label="Task Name" fullWidth sx={{ mb: 2 }} value={editedTask.title} onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })} required />
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Status</InputLabel>
                          <Select value={editedTask.status} onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value })} label="Status">
                            {['Planning', 'Execution', 'Review'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Assignee</InputLabel>
                          <Select value={editedTask.assignedTo.username} onChange={(e) => setEditedTask({ ...editedTask, assignedTo: { username: e.target.value } })} label="Assignee">
                            {users.map((user) => <MenuItem key={user._id} value={user.username}>{user.username}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Priority</InputLabel>
                          <Select value={editedTask.priority} onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })} label="Priority">
                            <MenuItem value="high">High</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="low">Low</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField label="Description" fullWidth sx={{ mb: 2 }} value={editedTask.description || ''} onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Button variant="contained" color="primary" onClick={handleSaveEdit}>Save</Button>
                          <Button variant="outlined" onClick={() => { setIsEditingTask(false); setEditedTask(taskDetails); }}>Cancel</Button>
                        </Box>
                      </>
                    ) : (
                      <>
                        <Typography variant="h6" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{taskDetails.title}</Typography>
                        <Typography>Status: {taskDetails.status}</Typography>
                        <Typography>Assigned to: {taskDetails.assignedTo.username}</Typography>
                        <Typography>Priority: {taskDetails.priority}</Typography>
                        <Typography>Description: {taskDetails.description || 'No description'}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                          <Button variant="contained" color="primary" onClick={handleEditTask}>Edit</Button>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={async () => {
                              try {
                                await axiosWithAuth.delete(`/tasks/${taskDetails._id}`);
                                const response = await axiosWithAuth.get('/tasks');
                                const sprintTasks = response.data.filter((task) => task.sprint._id === selectedSprint);
                                setTasks(sprintTasks);
                                setFilteredTasks(filterAssignee ? sprintTasks.filter((task) => task.assignedTo.username === filterAssignee) : sprintTasks);
                                setTaskDetails(null);
                                toast.success('Task deleted successfully');
                              } catch (error) {
                                console.error('Error deleting task:', error);
                                toast.error('Error deleting task');
                              }
                            }}
                          >
                            Delete
                          </Button>
                          <Button variant="outlined" onClick={() => { setTaskDetails(null); setIsEditingTask(false); }}>Close</Button>
                        </Box>
                      </>
                    )}
                  </>
                )}
              </Box>
            </Fade>
          </Modal>
          <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <DialogTitle>Confirm Edit</DialogTitle>
            <DialogContent><Typography>Are you sure you want to save changes to this task?</Typography></DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmOpen(false)} color="primary">Cancel</Button>
              <Button onClick={confirmSaveEdit} color="primary">Confirm</Button>
            </DialogActions>
          </Dialog>
          <Modal open={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
            <Fade in={isAddTaskOpen}>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'white', borderRadius: 2, boxShadow: 24, p: 4 }}>
                <Typography variant="h6" gutterBottom>Add New Task</Typography>
                <TextField label="Title" fullWidth sx={{ mb: 2 }} value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} required />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={newTask.status} onChange={(e) => setNewTask({ ...newTask, status: e.target.value })} label="Status">
                    {['Planning', 'Execution', 'Review'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Assignee</InputLabel>
                  <Select value={newTask.assignee} onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })} label="Assignee">
                    {users.map((user) => <MenuItem key={user._id} value={user.username}>{user.username}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} label="Priority">
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Description" fullWidth sx={{ mb: 2 }} value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="contained" color="primary" onClick={handleAddTask} disabled={!newTask.title || !newTask.assignee}>Add Task</Button>
                  <Button variant="outlined" onClick={() => setIsAddTaskOpen(false)}>Cancel</Button>
                </Box>
              </Box>
            </Fade>
          </Modal>
          <Modal open={isAddSprintOpen} onClose={() => setIsAddSprintOpen(false)} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
            <Fade in={isAddSprintOpen}>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'white', borderRadius: 2, boxShadow: 24, p: 4 }}>
                <Typography variant="h6" gutterBottom>Add New Sprint</Typography>
                <TextField label="Sprint Name" fullWidth sx={{ mb: 2 }} value={newSprint.name} onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })} required />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={newSprint.status} onChange={(e) => setNewSprint({ ...newSprint, status: e.target.value })} label="Status">
                    {['Pending', 'Active'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Start Date" type="date" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} value={newSprint.startDate} onChange={(e) => setNewSprint({ ...newSprint, startDate: e.target.value })} required />
                <TextField label="End Date" type="date" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} value={newSprint.endDate} onChange={(e) => setNewSprint({ ...newSprint, endDate: e.target.value })} required />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="contained" color="primary" onClick={handleAddSprint} disabled={!newSprint.name || !newSprint.startDate || !newSprint.endDate}>Add Sprint</Button>
                  <Button variant="outlined" onClick={() => setIsAddSprintOpen(false)}>Cancel</Button>
                </Box>
              </Box>
            </Fade>
          </Modal>
          <Modal open={isEditSprintOpen} onClose={() => setIsEditSprintOpen(false)} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
            <Fade in={isEditSprintOpen}>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'white', borderRadius: 2, boxShadow: 24, p: 4 }}>
                <Typography variant="h6" gutterBottom>Edit Sprint</Typography>
                {editSprint && (
                  <>
                    <TextField label="Sprint Name" fullWidth sx={{ mb: 2 }} value={editSprint.name} onChange={(e) => setEditSprint({ ...editSprint, name: e.target.value })} required />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Status</InputLabel>
                      <Select value={editSprint.status} onChange={(e) => setEditSprint({ ...editSprint, status: e.target.value })} label="Status">
                        {['Pending', 'Active'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField label="Start Date" type="date" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} value={editSprint.startDate} onChange={(e) => setEditSprint({ ...editSprint, startDate: e.target.value })} required />
                    <TextField label="End Date" type="date" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} value={editSprint.endDate} onChange={(e) => setEditSprint({ ...editSprint, endDate: e.target.value })} required />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Button variant="contained" color="primary" onClick={handleEditSprint} disabled={!editSprint.name || !editSprint.startDate || !editSprint.endDate}>Save</Button>
                      <Button variant="outlined" onClick={() => setIsEditSprintOpen(false)}>Cancel</Button>
                    </Box>
                  </>
                )}
              </Box>
            </Fade>
          </Modal>
          <Modal open={isFilterTasksOpen} onClose={() => setIsFilterTasksOpen(false)} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
            <Fade in={isFilterTasksOpen}>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'white', borderRadius: 2, boxShadow: 24, p: 4 }}>
                <Typography variant="h6" gutterBottom>Filter Tasks by Assignee</Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Assignee</InputLabel>
                  <Select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} label="Assignee">
                    <MenuItem value="">All</MenuItem>
                    {users.map((user) => <MenuItem key={user._id} value={user.username}>{user.username}</MenuItem>)}
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="contained" color="primary" onClick={handleFilterTasks}>Apply Filter</Button>
                  <Button variant="outlined" onClick={() => setIsFilterTasksOpen(false)}>Cancel</Button>
                </Box>
              </Box>
            </Fade>
          </Modal>
          <Modal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
            <Fade in={isSettingsOpen}>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'white', borderRadius: 2, boxShadow: 24, p: 4 }}>
                <Typography variant="h6" gutterBottom>Settings</Typography>
                <Typography>Theme toggle coming soon...</Typography>
                <Button onClick={() => setIsSettingsOpen(false)} sx={{ mt: 2 }}>Close</Button>
              </Box>
            </Fade>
          </Modal>
          <Modal open={openModal} onClose={handleCloseModal} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
            <Fade in={openModal}>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'white', borderRadius: 2, boxShadow: 24, p: 4 }}>
                <Typography variant="h6" gutterBottom>Bulk Update Tasks</Typography>
                <Typography sx={{ mb: 2 }}>Moving {selectedTasks.length} task(s) from {firstSelectedStatus} to:</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" component="label" htmlFor="new-status-select">New Status</Typography>
                  <select id="new-status-select" value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc', marginTop: '8px' }}>
                    <option value="" disabled>Select a status</option>
                    {firstSelectedStatus === 'Planning' ? (
                      <>
                        <option value="Execution">Execution</option>
                        <option value="Review">Review</option>
                      </>
                    ) : (
                      <option value="Review">Review</option>
                    )}
                  </select>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="contained" color="primary" onClick={handleBatchUpdate} disabled={isUpdating} startIcon={isUpdating ? <CircularProgress size={20} /> : null}>
                    {isUpdating ? 'Updating...' : 'Confirm'}
                  </Button>
                  <Button variant="outlined" onClick={handleCloseModal} disabled={isUpdating}>Cancel</Button>
                </Box>
              </Box>
            </Fade>
          </Modal>
        </Container>
      </Box>
    </Box>
  );
};

export default App;