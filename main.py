from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from models import StudentManager
from typing import List, Dict, Any
import os

# Create the StudentManager instance
manager = StudentManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    try:
        # alice = manager.add_student("Alice Smith", "S001")
        # alice.add_grade("Math", 95)
        # alice.add_grade("Science", 92)

        # bob = manager.add_student("Bob Johnson", "S002")
        # bob.add_grade("Math", 85)
        # bob.add_grade("Science", 88)

        manager.export_to_csv("students.csv")
    except Exception as e:
        print(f"Error during startup: {e}")
    yield
    # Shutdown logic (optional)
    # (e.g., close database connections)


app = FastAPI(lifespan=lifespan, title="Student Management System", version="1.0.0")

# Serve static files for frontend
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def read_root():
    return FileResponse("static/index.html")


@app.get("/api/students")
async def get_all_students():
    """Get all students with their details"""
    students_data = []
    for student in manager.students.values():
        students_data.append({
            "student_id": student.student_id,
            "name": student.name,
            "grades": student.grades,
            "average": student.calculate_average(),
            "honors": student.get_honors()
        })
    return {"students": students_data}


@app.get("/api/students/{student_id}")
async def get_student(student_id: str):
    """Get a specific student by ID"""
    student = manager.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {
        "student_id": student.student_id,
        "name": student.name,
        "grades": student.grades,
        "average": student.calculate_average(),
        "honors": student.get_honors()
    }


@app.post("/api/students")
async def create_student(student_data: Dict[str, Any]):
    """Create a new student"""
    try:
        name = student_data.get("name")
        student_id = student_data.get("student_id")
        
        if not name or not student_id:
            raise HTTPException(status_code=400, detail="Name and student_id are required")
        
        student = manager.add_student(name, student_id)
        
        # Add grades if provided
        grades = student_data.get("grades", {})
        for subject, score in grades.items():
            student.add_grade(subject, score)
        
        manager.export_to_csv("students.csv")
        
        return {
            "message": "Student created successfully",
            "student": {
                "student_id": student.student_id,
                "name": student.name,
                "grades": student.grades,
                "average": student.calculate_average(),
                "honors": student.get_honors()
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/students/{student_id}")
async def update_student(student_id: str, student_data: Dict[str, Any]):
    """Update an existing student"""
    student = manager.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    try:
        # Update name if provided
        if "name" in student_data:
            student.name = student_data["name"]
        
        # Update grades if provided
        grades = student_data.get("grades", {})
        for subject, score in grades.items():
            student.add_grade(subject, score)
        
        manager.export_to_csv("students.csv")
        
        return {
            "message": "Student updated successfully",
            "student": {
                "student_id": student.student_id,
                "name": student.name,
                "grades": student.grades,
                "average": student.calculate_average(),
                "honors": student.get_honors()
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/students/{student_id}")
async def delete_student(student_id: str):
    """Delete a student"""
    student = manager.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    del manager.students[student_id]
    manager.export_to_csv("students.csv")
    
    return {"message": "Student deleted successfully"}


@app.post("/api/students/{student_id}/grades")
async def add_grade(student_id: str, grade_data: Dict[str, Any]):
    """Add a grade to a student"""
    student = manager.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    try:
        subject = grade_data.get("subject")
        score = grade_data.get("score")
        
        if not subject or score is None:
            raise HTTPException(status_code=400, detail="Subject and score are required")
        
        student.add_grade(subject, score)
        manager.export_to_csv("students.csv")
        
        return {
            "message": "Grade added successfully",
            "student": {
                "student_id": student.student_id,
                "name": student.name,
                "grades": student.grades,
                "average": student.calculate_average(),
                "honors": student.get_honors()
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/students/{student_id}/grades/{subject}")
async def remove_grade(student_id: str, subject: str):
    """Remove a grade from a student"""
    student = manager.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if subject not in student.grades:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    student.remove_grade(subject)
    manager.export_to_csv("students.csv")
    
    return {
        "message": "Grade removed successfully",
        "student": {
            "student_id": student.student_id,
            "name": student.name,
            "grades": student.grades,
            "average": student.calculate_average(),
            "honors": student.get_honors()
        }
    }


@app.get("/api/top_students")
async def get_top_students(min_avg: float = 0.0):
    """Get students with average grade above minimum threshold"""
    top_students = []
    for student in manager.students.values():
        avg = student.calculate_average()
        if avg >= min_avg:
            top_students.append({
                "name": student.name,
                "student_id": student.student_id,
                "grades": student.grades,
                "average": avg,
                "honors": student.get_honors()
            })
    top_students.sort(key=lambda x: x["average"], reverse=True)
    return {"students": top_students}


@app.get("/api/statistics")
async def get_statistics():
    """Get overall statistics for all students"""
    stats = manager.get_statistics()
    return stats


@app.get("/api/students/honors/{honors}")
async def get_students_by_honors(honors: str):
    """Get all students with a specific honors grade"""
    students_list = manager.get_students_by_honors(honors)
    students_data = []
    for student in students_list:
        students_data.append({
            "student_id": student.student_id,
            "name": student.name,
            "grades": student.grades,
            "average": student.calculate_average(),
            "honors": student.get_honors()
        })
    return {"students": students_data}


@app.get("/api/export")
async def export_students():
    """Export all students to CSV"""
    try:
        manager.export_to_csv("students.csv")
        return {"message": "Students exported to CSV successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


# @app.get("/api/health")
# async def health_check():
#     """Health check endpoint"""
#     return {
#         "status": "healthy",
#         "total_students": len(manager.students),
#         "timestamp": "2024-01-01T00:00:00Z"
#     }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)