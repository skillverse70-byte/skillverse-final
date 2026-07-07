from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0002_event_category_event_cover_image_url_event_is_online_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="field_signals",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="event",
            name="participation_signals",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="event",
            name="related_course_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="event",
            name="related_skills",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
