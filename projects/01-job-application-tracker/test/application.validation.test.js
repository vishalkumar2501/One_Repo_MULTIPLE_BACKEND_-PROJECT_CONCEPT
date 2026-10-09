const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  createApplicationSchema,
  updateApplicationSchema,
  applicationIdParamSchema,
  addInterviewStageSchema,
  updateStatusSchema,
  queryApplicationsSchema
} = require('../src/validations/application.validation');

describe('Job Application Validation Schemas Unit Tests', () => {
  const validObjectId = '6650a2b8e3f41234567890cd';

  describe('createApplicationSchema validation', () => {
    const validBody = {
      company: 'TechCorp International',
      position: 'Backend Software Architect',
      jobType: 'full-time',
      workLocation: 'remote',
      location: 'New York, NY',
      status: 'applied',
      salary: {
        min: 130000,
        max: 170000,
        currency: 'USD',
        period: 'yearly'
      },
      jobUrl: 'https://techcorp.com/jobs/12345',
      contact: {
        name: 'Sarah Connor',
        email: 'sarah.connor@techcorp.com',
        phone: '+1234567890'
      },
      notes: 'Submitted portfolio along with application',
      priority: 'high'
    };

    test('should successfully validate a complete valid application payload', () => {
      const { error, value } = createApplicationSchema.body.validate(validBody);
      assert.strictEqual(error, undefined);
      assert.strictEqual(value.company, validBody.company);
      assert.strictEqual(value.position, validBody.position);
      assert.strictEqual(value.isArchived, false);
    });

    test('should fail validation when company or position is missing', () => {
      const { error: compErr } = createApplicationSchema.body.validate({
        position: 'Engineer'
      });
      assert.ok(compErr);
      assert.ok(compErr.details.some((d) => d.path.includes('company')));

      const { error: posErr } = createApplicationSchema.body.validate({
        company: 'Acme'
      });
      assert.ok(posErr);
      assert.ok(posErr.details.some((d) => d.path.includes('position')));
    });

    test('should reject invalid jobType or workLocation values', () => {
      const { error: jobTypeErr } = createApplicationSchema.body.validate({
        ...validBody,
        jobType: 'not-a-job-type'
      });
      assert.ok(jobTypeErr);

      const { error: locErr } = createApplicationSchema.body.validate({
        ...validBody,
        workLocation: 'underwater'
      });
      assert.ok(locErr);
    });

    test('should reject invalid URL in jobUrl', () => {
      const { error } = createApplicationSchema.body.validate({
        ...validBody,
        jobUrl: 'not_a_valid_url'
      });
      assert.ok(error);
      assert.ok(error.details.some((d) => d.path.includes('jobUrl')));
    });

    test('should assign defaults for optional omitted fields', () => {
      const minimalBody = {
        company: 'Minimalist Startup',
        position: 'Junior Dev'
      };

      const { error, value } = createApplicationSchema.body.validate(minimalBody);
      assert.strictEqual(error, undefined);
      assert.strictEqual(value.jobType, 'full-time');
      assert.strictEqual(value.workLocation, 'remote');
      assert.strictEqual(value.status, 'applied');
      assert.strictEqual(value.priority, 'medium');
      assert.strictEqual(value.isArchived, false);
      assert.strictEqual(value.notes, '');
      assert.strictEqual(value.salary.currency, 'USD');
    });
  });

  describe('updateApplicationSchema validation', () => {
    test('should validate valid update body and objectId params', () => {
      const { error: paramErr } = updateApplicationSchema.params.validate({ id: validObjectId });
      assert.strictEqual(paramErr, undefined);

      const { error: bodyErr } = updateApplicationSchema.body.validate({
        status: 'interviewing',
        notes: 'Updated interview scheduled for tomorrow'
      });
      assert.strictEqual(bodyErr, undefined);
    });

    test('should reject update with empty body', () => {
      const { error } = updateApplicationSchema.body.validate({});
      assert.ok(error);
      assert.ok(error.message.includes('At least one field'));
    });

    test('should reject invalid 24-character hexadecimal ObjectId param', () => {
      const invalidIds = ['123', 'not-an-object-id', '6650a2b8e3f41234567890z!'];
      for (const id of invalidIds) {
        const { error } = updateApplicationSchema.params.validate({ id });
        assert.ok(error);
      }
    });
  });

  describe('applicationIdParamSchema validation', () => {
    test('should accept valid Mongo ObjectId', () => {
      const { error } = applicationIdParamSchema.params.validate({ id: validObjectId });
      assert.strictEqual(error, undefined);
    });

    test('should reject invalid or missing ObjectId', () => {
      const { error: missingErr } = applicationIdParamSchema.params.validate({});
      assert.ok(missingErr);

      const { error: invalidErr } = applicationIdParamSchema.params.validate({ id: 'bad-id' });
      assert.ok(invalidErr);
    });
  });

  describe('addInterviewStageSchema validation', () => {
    test('should accept valid interview stage body', () => {
      const stagePayload = {
        stageName: 'System Architecture Round',
        stageDate: new Date().toISOString(),
        interviewer: 'David Chief Architect',
        status: 'scheduled',
        feedback: 'Prepare distributed systems case study'
      };

      const { error, value } = addInterviewStageSchema.body.validate(stagePayload);
      assert.strictEqual(error, undefined);
      assert.strictEqual(value.stageName, stagePayload.stageName);
    });

    test('should fail when stageName is missing or too short', () => {
      const { error: missingErr } = addInterviewStageSchema.body.validate({});
      assert.ok(missingErr);

      const { error: shortErr } = addInterviewStageSchema.body.validate({ stageName: 'A' });
      assert.ok(shortErr);
    });

    test('should reject invalid stage status', () => {
      const { error } = addInterviewStageSchema.body.validate({
        stageName: 'Screening',
        status: 'postponed' // not in enum
      });
      assert.ok(error);
    });
  });

  describe('updateStatusSchema validation', () => {
    test('should accept valid status update', () => {
      const { error, value } = updateStatusSchema.body.validate({
        status: 'rejected',
        rejectionReason: 'Position placed on hold'
      });
      assert.strictEqual(error, undefined);
      assert.strictEqual(value.status, 'rejected');
      assert.strictEqual(value.rejectionReason, 'Position placed on hold');
    });

    test('should fail when status is missing or invalid', () => {
      const { error: missingErr } = updateStatusSchema.body.validate({});
      assert.ok(missingErr);

      const { error: invalidErr } = updateStatusSchema.body.validate({
        status: 'draft'
      });
      assert.ok(invalidErr);
    });
  });

  describe('queryApplicationsSchema validation', () => {
    test('should validate query filters, pagination, and sorting defaults', () => {
      const query = {
        search: 'Engineer',
        status: 'interviewing',
        jobType: 'full-time',
        workLocation: 'remote',
        priority: 'high',
        isArchived: false,
        page: 2,
        limit: 25,
        sortBy: 'applicationDate',
        sortOrder: 'asc'
      };

      const { error, value } = queryApplicationsSchema.query.validate(query);
      assert.strictEqual(error, undefined);
      assert.strictEqual(value.search, 'Engineer');
      assert.strictEqual(value.page, 2);
      assert.strictEqual(value.limit, 25);
      assert.strictEqual(value.sortBy, 'applicationDate');
      assert.strictEqual(value.sortOrder, 'asc');
    });

    test('should set standard defaults when query is empty', () => {
      const { error, value } = queryApplicationsSchema.query.validate({});
      assert.strictEqual(error, undefined);
      assert.strictEqual(value.page, 1);
      assert.strictEqual(value.limit, 10);
      assert.strictEqual(value.sortBy, 'createdAt');
      assert.strictEqual(value.sortOrder, 'desc');
    });

    test('should reject limit greater than 100 or page less than 1', () => {
      const { error: limitErr } = queryApplicationsSchema.query.validate({ limit: 500 });
      assert.ok(limitErr);

      const { error: pageErr } = queryApplicationsSchema.query.validate({ page: 0 });
      assert.ok(pageErr);
    });
  });
});
