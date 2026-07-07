from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("opportunities", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="opportunity",
            name="related_course_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="opportunity",
            name="verified_activity_signals",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
