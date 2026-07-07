from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0003_enrollmentlessonprogress"),
    ]

    operations = [
        migrations.AddField(
            model_name="lessonitem",
            name="checklist_items",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="lessonitem",
            name="content_file",
            field=models.FileField(blank=True, upload_to="course_lessons/"),
        ),
    ]
