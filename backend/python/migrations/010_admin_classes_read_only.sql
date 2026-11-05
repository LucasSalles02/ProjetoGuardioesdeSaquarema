UPDATE access_profiles
SET permissions=permissions - 'classes.create' - 'classes.update' - 'enrollments.update',
    updated_at=CURRENT_TIMESTAMP
WHERE base_role='ADMIN';
