// Global variables
let students = [];
let filteredStudents = [];
let currentEditingStudent = null;
let currentGradeStudent = null;

// API Base URL
const API_BASE = '/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    loadStudents();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(filterStudents, 300));

    // Modal close on outside click
    window.addEventListener('click', function (event) {
        const studentModal = document.getElementById('studentModal');
        const gradeModal = document.getElementById('gradeModal');

        if (event.target === studentModal) {
            closeModal();
        }
        if (event.target === gradeModal) {
            closeGradeModal();
        }
    });
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// API Functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Load all students
async function loadStudents() {
    try {
        showLoading();
        const data = await apiCall('/students');
        students = data.students;
        filteredStudents = [...students];
        renderStudents();
        updateStatistics();
        hideLoading();
    } catch (error) {
        showNotification('Error loading students: ' + error.message, 'error');
        hideLoading();
    }
}

// Render students table
function renderStudents() {
    const tbody = document.getElementById('studentsTableBody');

    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No students found</h3>
                        <p>Try adjusting your search or add a new student to get started.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredStudents.map(student => `
        <tr>
            <td class="student-id">${student.student_id}</td>
            <td class="student-name">${student.name}</td>
            <td>
                <div class="grades-display">
                    ${Object.entries(student.grades).map(([subject, score]) =>
        `<span class="grade-badge">${subject}: ${score}</span>`
    ).join('')}
                </div>
            </td>
            <td class="average-score">${student.average.toFixed(1)}</td>
            <td>
                <span class="honors-badge honors-${student.honors.toLowerCase()}">${student.honors}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-edit" onclick="editStudent('${student.student_id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn btn-grade" onclick="showAddGradeModal('${student.student_id}')">
                        <i class="fas fa-plus"></i> Grade
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteStudent('${student.student_id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update statistics
function updateStatistics() {
    const statsContainer = document.getElementById('statsContainer');

    if (students.length === 0) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3><i class="fas fa-users"></i> Total Students</h3>
                <div class="stat-value">0</div>
                <div class="stat-label">No students registered</div>
            </div>
        `;
        return;
    }

    const totalStudents = students.length;
    const avgGrade = students.reduce((sum, student) => sum + student.average, 0) / totalStudents;

    // Calculate honors distribution
    const honorsDist = students.reduce((acc, student) => {
        acc[student.honors] = (acc[student.honors] || 0) + 1;
        return acc;
    }, {});

    const topPerformers = students.filter(s => s.average >= 90).length;
    const totalSubjects = students.reduce((sum, student) => sum + Object.keys(student.grades).length, 0);

    statsContainer.innerHTML = `
        <div class="stat-card">
            <h3><i class="fas fa-users"></i> Total Students</h3>
            <div class="stat-value">${totalStudents}</div>
            <div class="stat-label">Registered students</div>
        </div>
        <div class="stat-card">
            <h3><i class="fas fa-chart-line"></i> Average Grade</h3>
            <div class="stat-value">${avgGrade.toFixed(1)}</div>
            <div class="stat-label">Class average</div>
        </div>
        <div class="stat-card">
            <h3><i class="fas fa-star"></i> Top Performers</h3>
            <div class="stat-value">${topPerformers}</div>
            <div class="stat-label">Students with A grade</div>
        </div>
    `;
}

// Filter students
function filterStudents() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const honorsFilter = document.getElementById('honorsFilter').value;
    const minAvgFilter = parseFloat(document.getElementById('minAvgFilter').value) || 0;

    filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm) ||
            student.student_id.toLowerCase().includes(searchTerm);
        const matchesHonors = !honorsFilter || student.honors === honorsFilter;
        const matchesMinAvg = student.average >= minAvgFilter;

        return matchesSearch && matchesHonors && matchesMinAvg;
    });

    renderStudents();
}

// Modal functions
function showAddStudentModal() {
    currentEditingStudent = null;
    document.getElementById('modalTitle').textContent = 'Add New Student';
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').disabled = false;
    clearGradeRows();
    addGradeRow(); // Add one empty grade row
    document.getElementById('studentModal').style.display = 'block';
}

function showEditStudentModal(studentId) {
    const student = students.find(s => s.student_id === studentId);
    if (!student) return;

    currentEditingStudent = student;
    document.getElementById('modalTitle').textContent = 'Edit Student';
    document.getElementById('studentId').value = student.student_id;
    document.getElementById('studentId').disabled = true;
    document.getElementById('studentName').value = student.name;

    clearGradeRows();
    Object.entries(student.grades).forEach(([subject, score]) => {
        addGradeRow(subject, score);
    });

    document.getElementById('studentModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('studentModal').style.display = 'none';
    currentEditingStudent = null;
}

function showAddGradeModal(studentId) {
    currentGradeStudent = studentId;
    document.getElementById('gradeForm').reset();
    document.getElementById('gradeModal').style.display = 'block';
}

function closeGradeModal() {
    document.getElementById('gradeModal').style.display = 'none';
    currentGradeStudent = null;
}

// Grade row management
function addGradeRow(subject = '', score = '') {
    const container = document.getElementById('gradesContainer');
    const gradeRow = document.createElement('div');
    gradeRow.className = 'grade-row';
    gradeRow.innerHTML = `
        <input type="text" placeholder="Subject" class="grade-subject" value="${subject}">
        <input type="number" placeholder="Score" class="grade-score" min="0" max="100" step="0.1" value="${score}">
        <button type="button" class="btn btn-danger btn-sm" onclick="removeGradeRow(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(gradeRow);
}

function removeGradeRow(button) {
    const container = document.getElementById('gradesContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

function clearGradeRows() {
    const container = document.getElementById('gradesContainer');
    container.innerHTML = '';
}

// Form submissions
async function handleStudentSubmit(event) {
    event.preventDefault();

    const studentId = document.getElementById('studentId').value;
    const studentName = document.getElementById('studentName').value;

    // Collect grades
    const grades = {};
    const gradeRows = document.querySelectorAll('.grade-row');
    gradeRows.forEach(row => {
        const subject = row.querySelector('.grade-subject').value.trim();
        const score = parseFloat(row.querySelector('.grade-score').value);
        if (subject && !isNaN(score)) {
            grades[subject] = score;
        }
    });

    const studentData = {
        student_id: studentId,
        name: studentName,
        grades: grades
    };

    try {
        if (currentEditingStudent) {
            // Update existing student
            await apiCall(`/students/${studentId}`, {
                method: 'PUT',
                body: JSON.stringify(studentData)
            });
            showNotification('Student updated successfully!', 'success');
        } else {
            // Create new student
            await apiCall('/students', {
                method: 'POST',
                body: JSON.stringify(studentData)
            });
            showNotification('Student created successfully!', 'success');
        }

        closeModal();
        loadStudents();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

async function handleGradeSubmit(event) {
    event.preventDefault();

    const subject = document.getElementById('gradeSubject').value;
    const score = parseFloat(document.getElementById('gradeScore').value);

    try {
        await apiCall(`/students/${currentGradeStudent}/grades`, {
            method: 'POST',
            body: JSON.stringify({ subject, score })
        });

        showNotification('Grade added successfully!', 'success');
        closeGradeModal();
        loadStudents();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

// CRUD Operations
async function editStudent(studentId) {
    showEditStudentModal(studentId);
}

async function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        return;
    }

    try {
        await apiCall(`/students/${studentId}`, {
            method: 'DELETE'
        });

        showNotification('Student deleted successfully!', 'success');
        loadStudents();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

async function exportData() {
    try {
        await apiCall('/export');
        showNotification('Data exported to CSV successfully!', 'success');
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function showLoading() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div class="loading"></div>
                <p style="margin-top: 10px; color: #718096;">Loading students...</p>
            </td>
        </tr>
    `;
}

function hideLoading() {
    // Loading is hidden when renderStudents() is called
}

// Keyboard shortcuts
document.addEventListener('keydown', function (event) {
    // Escape key to close modals
    if (event.key === 'Escape') {
        closeModal();
        closeGradeModal();
    }

    // // Ctrl/Cmd + N to add new student
    // if ((event.ctrlKey || event.metaKey) && event.altKey && event.key === 's') {
    //     console.log("ctrl+shift+s");
    //     event.preventDefault();
    //     showAddStudentModal();
    // }

    // // Ctrl/Cmd + F to focus search
    // if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    //     event.preventDefault();
    //     document.getElementById('searchInput').focus();
    // }
});

// Auto-refresh data every 30 seconds
// setInterval(() => {
//     loadStudents();
// }, 30000); 