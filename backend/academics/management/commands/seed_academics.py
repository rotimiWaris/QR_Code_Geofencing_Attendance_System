from django.core.management.base import BaseCommand
from academics.models import ClassGroup, Course, Enrollment, Venue
from accounts.models import StudentProfile

COURSES = {
    "ND1": [
        ("COM111", "Introduction to Computing"), ("COM112", "Introduction to Digital Electronics"),
        ("COM113", "Introduction to Programming"), ("COM114", "Statistics for Computing"),
        ("COM115", "Computer Application Packages"),
    ],
    "ND2": [
        ("COM211", "Object-Oriented Programming"), ("COM222", "Database Design and Management"),
        ("COM213", "Systems Analysis and Design"), ("COM214", "Computer Systems Troubleshooting"),
        ("COM215", "Web Technology"),
    ],
    "HND1": [
        ("SWD311", "Software Requirements Engineering"), ("SWD322", "Software Testing and Quality Assurance"),
        ("SWD324", "Mobile Application Development"), ("NCC311", "Network Fundamentals"),
        ("NCC322", "Network Administration"), ("NCC323", "Network Security"),
    ],
    "HND2": [
        ("SWD411", "Software Project Management"), ("SWD422", "Advanced Web Development"),
        ("SWD424", "DevOps and Deployment"), ("NCC411", "Advanced Computer Networks"),
        ("NCC422", "Cloud Computing"), ("NCC423", "Cybersecurity Operations"),
    ],
}
VENUES = ["Room 1", "Room 2", "Room 4", "Lab 1", "Lab 2", "Lab 3"]

class Command(BaseCommand):
    help = "Create the configured courses, class groups, venues, and level-matched enrollments."

    def handle(self, *args, **options):
        venues = []
        for name in VENUES:
            venue, _ = Venue.objects.update_or_create(name=name, defaults={"building":"Main Campus","room_number":name,"capacity":50,"default_radius":75,"is_active":True})
            venues.append(venue)

        group_count = 0
        enrollment_count = 0
        index = 0
        for level, course_rows in COURSES.items():
            for code, name in course_rows:
                course, _ = Course.objects.update_or_create(code=code, defaults={"name":name,"level":level,"department":"Computer Science","semester":"First","credit_units":3,"is_active":True})
                group, _ = ClassGroup.objects.update_or_create(
                    course=course, name=f"{level} Class", academic_year="2026/2027", semester="First",
                    defaults={"venue":venues[index % len(venues)],"capacity":50,"is_active":True},
                )
                group_count += 1
                index += 1
                for student in StudentProfile.objects.filter(level=level):
                    _, created = Enrollment.objects.get_or_create(class_group=group, student=student)
                    enrollment_count += int(created)

        self.stdout.write(self.style.SUCCESS(f"Academic data ready: {sum(map(len, COURSES.values()))} courses, {group_count} classes, {len(venues)} venues, {enrollment_count} new enrollments."))
