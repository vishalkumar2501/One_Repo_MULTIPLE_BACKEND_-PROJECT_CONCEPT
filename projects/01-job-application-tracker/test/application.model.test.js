const { test, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const {
  Application,
  APPLICATION_STATUS,
  APPLICATION_STATUSES,
  JOB_TYPE,
  JOB_TYPES,
  WORK_LOCATION,
  WORK_LOCATIONS,
  APPLICATION_PRIORITY,
  APPLICATION_PRIORITIES,
  SALARY_PERIOD,
  SALARY_PERIODS,
  INTERVIEW_STAGE_STATUS,
  INTERVIEW_STAGE_STATUSES
} = require('../src/models/application.model');

describe('Job Application Model & Schema Unit Tests', () => {
  const sampleUserId = new mongoose.Types.ObjectId('6650a2b8e3f41234567890cd');

  const validApplicationData = {
    user: sampleUserId,
    company: 'Acme Corp',
    position: 'Senior Backend Engineer',
    jobType: JOB_TYPE.FULL_TIME,
    workLocation: WORK_LOCATION.REMOTE,
    location: 'San Francisco, CA',
    status: APPLICATION_STATUS.APPLIED,
    salary: {
      min: 120000,
      max: 160000,
      currency: 'USD',
      period: SALARY_PERIOD.YEARLY
    },
    applicationDate: new Date('2026-10-01'),
    jobUrl: 'https://example.com/careers/backend-eng',
    contact: {
      name: 'Alice Recruiter',
      email: 'alice@acmecorp.com',
      phone: '+1-555-0199'
    },
    notes: 'Applied via company portal with tailored resume',
    priority: APPLICATION_PRIORITY.HIGH
  };

  /**
   * Helper to validate a document and return error if any
   */
  const getValidationError = async (doc) => {
    try {
      await doc.validate();
      return null;
    } catch (err) {
      return err;
    }
  };

  test('should validate a valid application payload without errors', async () => {
    const app = new Application(validApplicationData);
    const err = await getValidationError(app);
    assert.strictEqual(err, null);
  });

  test('should fail validation when required fields (user, company, position) are missing', async () => {
    const app = new Application({});
    const err = await getValidationError(app);

    assert.ok(err);
    assert.ok(err.errors.user, 'User reference should be required');
    assert.ok(err.errors.company, 'Company name should be required');
    assert.ok(err.errors.position, 'Position title should be required');
  });

  test('should enforce minimum and maximum length constraints on company and position', async () => {
    const shortCompanyApp = new Application({
      ...validApplicationData,
      company: 'A'
    });
    const shortCompErr = await getValidationError(shortCompanyApp);
    assert.ok(shortCompErr.errors.company);

    const longCompanyApp = new Application({
      ...validApplicationData,
      company: 'A'.repeat(101)
    });
    const longCompErr = await getValidationError(longCompanyApp);
    assert.ok(longCompErr.errors.company);

    const shortPosApp = new Application({
      ...validApplicationData,
      position: 'P'
    });
    const shortPosErr = await getValidationError(shortPosApp);
    assert.ok(shortPosErr.errors.position);

    const longPosApp = new Application({
      ...validApplicationData,
      position: 'P'.repeat(101)
    });
    const longPosErr = await getValidationError(longPosApp);
    assert.ok(longPosErr.errors.position);
  });

  test('should validate allowed status values and reject invalid status', async () => {
    for (const status of APPLICATION_STATUSES) {
      const app = new Application({
        ...validApplicationData,
        status
      });
      const err = await getValidationError(app);
      assert.strictEqual(err, null);
    }

    const invalidStatusApp = new Application({
      ...validApplicationData,
      status: 'pending_review'
    });
    const invalidErr = await getValidationError(invalidStatusApp);
    assert.ok(invalidErr.errors.status);
  });

  test('should validate allowed jobType values and reject invalid jobType', async () => {
    for (const jobType of JOB_TYPES) {
      const app = new Application({
        ...validApplicationData,
        jobType
      });
      const err = await getValidationError(app);
      assert.strictEqual(err, null);
    }

    const invalidJobTypeApp = new Application({
      ...validApplicationData,
      jobType: 'temporary-gig'
    });
    const invalidErr = await getValidationError(invalidJobTypeApp);
    assert.ok(invalidErr.errors.jobType);
  });

  test('should validate allowed workLocation values and reject invalid workLocation', async () => {
    for (const workLocation of WORK_LOCATIONS) {
      const app = new Application({
        ...validApplicationData,
        workLocation
      });
      const err = await getValidationError(app);
      assert.strictEqual(err, null);
    }

    const invalidWorkLocationApp = new Application({
      ...validApplicationData,
      workLocation: 'satellite-office'
    });
    const invalidErr = await getValidationError(invalidWorkLocationApp);
    assert.ok(invalidErr.errors.workLocation);
  });

  test('should validate allowed priority values and reject invalid priority', async () => {
    for (const priority of APPLICATION_PRIORITIES) {
      const app = new Application({
        ...validApplicationData,
        priority
      });
      const err = await getValidationError(app);
      assert.strictEqual(err, null);
    }

    const invalidPriorityApp = new Application({
      ...validApplicationData,
      priority: 'urgent-critical'
    });
    const invalidErr = await getValidationError(invalidPriorityApp);
    assert.ok(invalidErr.errors.priority);
  });

  test('should set default schema values appropriately', () => {
    const app = new Application({
      user: sampleUserId,
      company: 'Test Startup',
      position: 'Fullstack Dev'
    });

    assert.strictEqual(app.jobType, JOB_TYPE.FULL_TIME);
    assert.strictEqual(app.workLocation, WORK_LOCATION.REMOTE);
    assert.strictEqual(app.status, APPLICATION_STATUS.APPLIED);
    assert.strictEqual(app.priority, APPLICATION_PRIORITY.MEDIUM);
    assert.strictEqual(app.isArchived, false);
    assert.strictEqual(app.salary.currency, 'USD');
    assert.strictEqual(app.salary.period, SALARY_PERIOD.YEARLY);
    assert.strictEqual(app.salary.min, null);
    assert.strictEqual(app.salary.max, null);
    assert.ok(app.applicationDate instanceof Date);
    assert.deepStrictEqual(app.interviewStages, []);
  });

  test('should invalidate when salary.min is greater than salary.max', async () => {
    const invalidSalaryApp = new Application({
      ...validApplicationData,
      salary: {
        min: 180000,
        max: 120000
      }
    });

    const err = await getValidationError(invalidSalaryApp);
    assert.ok(err);
    assert.ok(err.errors['salary.min']);
    assert.strictEqual(err.errors['salary.min'].message, 'Minimum salary cannot be greater than maximum salary');
  });

  test('should invalidate when salary numbers are negative', async () => {
    const negativeSalaryApp = new Application({
      ...validApplicationData,
      salary: {
        min: -100,
        max: 50000
      }
    });

    const err = await getValidationError(negativeSalaryApp);
    assert.ok(err);
    assert.ok(err.errors['salary.min']);
  });

  test('should validate embedded interview stages with valid subdocument attributes', async () => {
    const app = new Application({
      ...validApplicationData,
      interviewStages: [
        {
          stageName: 'Technical Phone Screen',
          stageDate: new Date('2026-10-05'),
          interviewer: 'Bob Tech Lead',
          status: INTERVIEW_STAGE_STATUS.PASSED,
          feedback: 'Strong DSA and system fundamentals'
        },
        {
          stageName: 'System Design Onsite',
          status: INTERVIEW_STAGE_STATUS.SCHEDULED
        }
      ]
    });

    const err = await getValidationError(app);
    assert.strictEqual(err, null);
    assert.strictEqual(app.interviewStages.length, 2);
    assert.strictEqual(app.interviewStages[0].status, INTERVIEW_STAGE_STATUS.PASSED);
    assert.strictEqual(app.interviewStages[1].status, INTERVIEW_STAGE_STATUS.SCHEDULED);
  });

  test('should fail validation on invalid interview stage attributes', async () => {
    const app = new Application({
      ...validApplicationData,
      interviewStages: [
        {
          stageName: 'A', // too short (< 2)
          status: 'invalid_stage_status'
        }
      ]
    });

    const err = await getValidationError(app);
    assert.ok(err);
    assert.ok(err.errors['interviewStages.0.stageName']);
    assert.ok(err.errors['interviewStages.0.status']);
  });

  test('addInterviewStage instance method should append stage and update status to interviewing if applied', () => {
    const app = new Application(validApplicationData);
    assert.strictEqual(app.status, APPLICATION_STATUS.APPLIED);

    const added = app.addInterviewStage({
      stageName: 'Initial Screening',
      interviewer: 'Jane HR'
    });

    assert.strictEqual(app.interviewStages.length, 1);
    assert.strictEqual(app.interviewStages[0].stageName, 'Initial Screening');
    assert.strictEqual(app.status, APPLICATION_STATUS.INTERVIEWING);
    assert.strictEqual(added.stageName, 'Initial Screening');
  });

  test('updateStatus instance method should set new status and handle rejection reason', () => {
    const app = new Application(validApplicationData);

    app.updateStatus(APPLICATION_STATUS.REJECTED, 'Position filled internally');
    assert.strictEqual(app.status, APPLICATION_STATUS.REJECTED);
    assert.strictEqual(app.rejectionReason, 'Position filled internally');

    app.updateStatus(APPLICATION_STATUS.OFFERED);
    assert.strictEqual(app.status, APPLICATION_STATUS.OFFERED);
    assert.strictEqual(app.rejectionReason, null);

    assert.throws(() => {
      app.updateStatus('unknown_status');
    }, /Invalid status/);
  });

  test('archive and unarchive instance methods should toggle isArchived flag', () => {
    const app = new Application(validApplicationData);
    assert.strictEqual(app.isArchived, false);

    app.archive();
    assert.strictEqual(app.isArchived, true);

    app.unarchive();
    assert.strictEqual(app.isArchived, false);
  });

  test('toJSON transform should exclude __v field', () => {
    const app = new Application(validApplicationData);
    const json = JSON.parse(JSON.stringify(app));

    assert.strictEqual(json.company, validApplicationData.company);
    assert.strictEqual(json.position, validApplicationData.position);
    assert.strictEqual(json.__v, undefined);
  });

  test('static findByUser should construct valid query filter', () => {
    const query = Application.findByUser(sampleUserId, { status: 'applied' });
    assert.strictEqual(query.getQuery().user.toString(), sampleUserId.toString());
    assert.strictEqual(query.getQuery().status, 'applied');
  });
});
