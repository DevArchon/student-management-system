import csv
from datetime import datetime
from typing import Dict, Optional, List, Any

class Student:
    def __init__(self, name: str, student_id: str):
        self.name = name
        self.student_id = student_id
        self.grades: Dict[str, float] = {}

    def add_grade(self, subject: str, score: float) -> None:
        if not 0 <= score <= 100:
            raise ValueError("Score must be between 0 and 100")
        self.grades[subject] = score
        self._log_grade_change(subject, score, "ADD/UPDATE")

    def remove_grade(self, subject: str) -> None:
        if subject in self.grades:
            score = self.grades[subject]
            del self.grades[subject]
            self._log_grade_change(subject, score, "REMOVE")

    def calculate_average(self) -> float:
        if not self.grades:
            return 0.0
        return sum(self.grades.values()) / len(self.grades)

    def get_honors(self) -> str:
        avg = self.calculate_average()
        if avg >= 90: return "A"
        elif avg >= 80: return "B"
        elif avg >= 70: return "C"
        elif avg >= 60: return "D"
        else: return "F"

    def get_grade_summary(self) -> Dict[str, Any]:
        """Get a summary of the student's grades"""
        return {
            "student_id": self.student_id,
            "name": self.name,
            "grades": self.grades,
            "average": self.calculate_average(),
            "honors": self.get_honors(),
            "total_subjects": len(self.grades)
        }

    def _log_grade_change(self, subject: str, score: float, action: str) -> None:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open("grades.log", "a") as log_file:
            log_file.write(
                f"{timestamp} - Student: {self.name} ({self.student_id}), "
                f"Action: {action}, Subject: {subject}, Score: {score}\n"
            )

class StudentManager:
    def __init__(self):
        self.students: Dict[str, Student] = {}

    def add_student(self, name: str, student_id: str) -> Student:
        if student_id in self.students:
            raise ValueError(f"Student ID {student_id} already exists")
        student = Student(name, student_id)
        self.students[student_id] = student
        return student

    def get_student(self, student_id: str) -> Optional[Student]:
        return self.students.get(student_id)

    def get_all_students(self) -> List[Student]:
        return list(self.students.values())

    def remove_student(self, student_id: str) -> bool:
        if student_id in self.students:
            del self.students[student_id]
            return True
        return False

    def get_students_by_honors(self, honors: str) -> List[Student]:
        """Get all students with a specific honors grade"""
        return [student for student in self.students.values() if student.get_honors() == honors]

    def get_top_performers(self, limit: int = 5) -> List[Student]:
        """Get top performing students by average grade"""
        sorted_students = sorted(
            self.students.values(), 
            key=lambda x: x.calculate_average(), 
            reverse=True
        )
        return sorted_students[:limit]

    def get_statistics(self) -> Dict[str, Any]:
        """Get overall statistics for all students"""
        if not self.students:
            return {
                "total_students": 0,
                "average_grade": 0,
                "honors_distribution": {},
                "total_subjects": 0
            }
        
        total_avg = sum(student.calculate_average() for student in self.students.values())
        avg_grade = total_avg / len(self.students)
        
        honors_dist = {}
        for student in self.students.values():
            honors = student.get_honors()
            honors_dist[honors] = honors_dist.get(honors, 0) + 1
        
        total_subjects = sum(len(student.grades) for student in self.students.values())
        
        return {
            "total_students": len(self.students),
            "average_grade": round(avg_grade, 2),
            "honors_distribution": honors_dist,
            "total_subjects": total_subjects
        }

    def export_to_csv(self, filename: str) -> None:
        with open(filename, "w", newline="") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=["student_id", "name", "subjects", "average", "honors"])
            writer.writeheader()
            for student in self.students.values():
                writer.writerow({
                    "student_id": student.student_id,
                    "name": student.name,
                    "subjects": ", ".join(f"{subj}:{score}" for subj, score in student.grades.items()),
                    "average": student.calculate_average(),
                    "honors": student.get_honors()
                })