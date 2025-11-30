describe('Edumate Admin Panel Comprehensive Tests', () => {

  // ================================
  // STATIC TEST DATA
  // ================================
  const testCourse = {
    name: 'Cypress Full Test Course ' + Date.now(),
    credits: 4,
    category: 'Testing 101',
    desc: 'Full coverage test data'
  };
  
  const testStudent = {
    id: 'STU_FULL_TEST_' + Date.now(),
    name: 'Cypress Full User',
    phone: '1234567890',
    email: 'fulltest@cypress.io',
    address: '123 Full Coverage Lane'
  };

  // ================================
  // IMPROVED UTILITIES
  // ================================
  const waitForToast = (message, timeout = 15000) => {
    return cy.contains('.toast.show', message, { timeout })
      .should('be.visible')
      .then(() => {
        cy.wait(1000);
      });
  };

  const waitForAppLoad = () => {
    cy.get('#coursesGrid', { timeout: 30000 }).should('be.visible');
    cy.get('#studentsList', { timeout: 30000 }).should('be.visible');
    cy.get('body[data-courses-loaded="true"]', { timeout: 30000 }).should('exist');
    cy.wait(2000);
  };

  const ensureCleanSlate = () => {
    cy.log('Ensuring clean slate...');
    
    // Delete student if exists
    cy.get('body').then($body => {
      const studentElements = $body.find('.card .card-title:contains("' + testStudent.name + '")');
      if (studentElements.length > 0) {
        cy.contains('.card .card-title', testStudent.name)
          .parents('.card')
          .find('.btnDeleteStudent')
          .click();
        waitForToast('Student deleted');
        // Wait for deletion to complete
        cy.contains('.card .card-title', testStudent.name, { timeout: 10000 }).should('not.exist');
      }
    });

    // Delete course if exists  
    cy.get('body').then($body => {
      const courseElements = $body.find('.card .card-title:contains("' + testCourse.name + '")');
      if (courseElements.length > 0) {
        cy.contains('.card .card-title', testCourse.name)
          .parents('.card')
          .find('.btnDeleteCourse')
          .click();
        waitForToast('Course deleted');
        // Wait for deletion to complete
        cy.contains('.card .card-title', testCourse.name, { timeout: 10000 }).should('not.exist');
      }
    });
  };

  const login = () => {
    cy.log('Logging in...');
    
    // Check current state and handle accordingly
    cy.get('body').then($body => {
      const loginWrapper = $body.find('#loginWrapper');
      const adminPanel = $body.find('#adminPanel');
      
      // If already logged in, just wait for app load
      if (adminPanel.is(':visible')) {
        cy.log('Already logged in, waiting for app load...');
        waitForAppLoad();
        return;
      }
      
      // If login wrapper is visible, perform login
      if (loginWrapper.is(':visible')) {
        cy.get('#loginEmail')
          .should('be.visible')
          .clear()
          .type('admin@edumate.com');

        cy.get('#loginPass')
          .should('be.visible')
          .clear()
          .type('admin@edumate');

        cy.get('#loginBtn').click();

        cy.get('#adminPanel', { timeout: 30000 }).should('be.visible');
        waitForAppLoad();
      }
    });
  };

  // ============================================================
  // COMPLETELY REVISED BEFORE EACH - HANDLE FIREBASE AUTO-LOGIN
  // ============================================================
  beforeEach(() => {
    // Clear ALL storage completely
    cy.clearAllSessionStorage();
    cy.clearAllLocalStorage();
    cy.clearCookies();
    
    // Visit with complete clean state
    cy.visit('/', {
      onBeforeLoad: (win) => {
        win.sessionStorage.clear();
        win.localStorage.clear();
        // Clear Firebase auth persistence
        if (win.indexedDB) {
          win.indexedDB.databases().then(databases => {
            databases.forEach(db => {
              win.indexedDB.deleteDatabase(db.name);
            });
          });
        }
      }
    });

    // Wait for page to load and handle Firebase auto-login
    cy.get('body', { timeout: 10000 }).should('exist');
    
    // Check if we need to wait for login wrapper or if we're auto-logged-in
    cy.get('body', { timeout: 10000 }).then($body => {
      const loginWrapper = $body.find('#loginWrapper');
      const adminPanel = $body.find('#adminPanel');
      
      // If admin panel is immediately visible (Firebase auto-login), we're done
      if (adminPanel.is(':visible')) {
        cy.log('Auto-logged in by Firebase, proceeding...');
        return;
      }
      
      // If login wrapper is visible, wait for it to be fully ready
      if (loginWrapper.is(':visible')) {
        cy.get('#loginWrapper', { timeout: 10000 }).should('be.visible');
        cy.get('#loginEmail', { timeout: 10000 }).should('be.visible');
        cy.get('#loginPass', { timeout: 10000 }).should('be.visible');
      }
    });
  });

  // ============================================================
  // SUITE 1 — AUTHENTICATION TEST
  // ============================================================
  describe('1. Authentication Service', () => {
    it('Should block access without login and allow access after login', () => {
      cy.log('Starting authentication test...');
      
      // For auth test specifically, ensure we start logged out
      cy.window().then(win => {
        win.localStorage.clear();
        win.sessionStorage.clear();
      });
      
      cy.reload();
      
      // Wait for login form to be ready with increased timeout
      cy.get('#loginWrapper', { timeout: 15000 }).should('be.visible');
      cy.get('#loginEmail', { timeout: 15000 }).should('be.visible');
      cy.get('#loginPass', { timeout: 15000 }).should('be.visible');
      cy.get('#adminPanel').should('not.be.visible');

      // Test failed login - use force: true to bypass visibility issues
      cy.get('#loginEmail').type('wrong@user.com', { force: true });
      cy.get('#loginPass').type('wrongpass', { force: true });
      cy.get('#loginBtn').click({ force: true });

      // Check for error
      cy.get('body', { timeout: 10000 }).should($body => {
        const err = $body.find('#loginError');
        const wrapper = $body.find('#loginWrapper');
        
        if (err.length && err.text().trim().length > 0) {
          expect(err.text().toLowerCase()).to.include('invalid');
        } else {
          expect(wrapper.is(':visible')).to.be.true;
        }
      });

      // Test successful login
      cy.get('#loginEmail').clear().type('admin@edumate.com', { force: true });
      cy.get('#loginPass').clear().type('admin@edumate', { force: true });
      cy.get('#loginBtn').click({ force: true });

      // Verify successful login
      cy.get('#adminPanel', { timeout: 30000 }).should('be.visible');
      waitForAppLoad();
    });
  });

  // ============================================================
  // SUITE 2 — VALIDATION TESTS
  // ============================================================
  describe('2. Input Validation Logic', () => {
    beforeEach(() => {
      // Use conditional login that handles auto-login
      cy.get('body').then($body => {
        if ($body.find('#adminPanel:visible').length === 0) {
          login();
        } else {
          waitForAppLoad();
        }
      });
    });

    it('Should validate Course inputs', () => {
      // Test empty form submission
      cy.get('#courseForm button[type="submit"]').click();
      waitForToast('Name required');

      // Test invalid credits
      cy.get('#courseName').type('Bad Course');
      cy.get('#courseCredits').type('-5');
      cy.get('#courseForm button[type="submit"]').click();
      waitForToast('Invalid credits');

      // Test clear functionality
      cy.get('#courseClear').click();
      cy.get('#courseName').should('have.value', '');
      cy.get('#courseCredits').should('have.value', '');
    });

    it('Should validate Student inputs', () => {
      // Test empty form submission
      cy.get('#studentForm button[type="submit"]').click();
      waitForToast('ID + Name required');

      // Test invalid phone
      cy.get('#stuId').type('TEMP');
      cy.get('#stuName').type('Temp');
      cy.get('#stuPhone').type('123');
      cy.get('#studentForm button[type="submit"]').click();
      waitForToast('Phone must be 10 digits');
      
      // Test invalid email
      cy.get('#stuPhone').clear();
      cy.get('#stuEmail').type('bad-email');
      cy.get('#studentForm button[type="submit"]').click();
      waitForToast('Invalid email');
    });
  });

  // ============================================================
  // SUITE 3 — COURSE CRUD
  // ============================================================
  describe('3. Course CRUD & Duplicate Handling', () => {
    before(() => {
      login();
      ensureCleanSlate();
    });

    beforeEach(() => {
      // Use conditional login
      cy.get('body').then($body => {
        if ($body.find('#adminPanel:visible').length === 0) {
          login();
        } else {
          waitForAppLoad();
        }
      });
    });

    it('Should Create, Check Duplicate, Edit, and Delete a Course', () => {
      cy.log('Testing course CRUD operations...');
      
      // Create course
      cy.get('#courseName').type(testCourse.name);
      cy.get('#courseCredits').type(testCourse.credits);
      cy.get('#courseCategory').type(testCourse.category);
      cy.get('#courseDesc').type(testCourse.desc);
      cy.get('#courseForm button[type="submit"]').click();
      waitForToast('Course added');

      // Test duplicate prevention
      cy.get('#courseName').type(testCourse.name);
      cy.get('#courseCredits').type('3');
      cy.get('#courseForm button[type="submit"]').click();
      waitForToast('Course already exists');
      cy.get('#courseClear').click();

      // Edit course
      cy.contains('.card .card-title', testCourse.name)
        .parents('.card')
        .find('.btnEditCourse')
        .click();

      cy.get('#courseName').should('have.value', testCourse.name);
      cy.get('#courseName').clear().type(`${testCourse.name} EDITED`);
      cy.get('#courseForm button[type="submit"]').click();
      waitForToast('Course updated');

      // Delete course
      cy.contains('.card .card-title', `${testCourse.name} EDITED`)
        .parents('.card')
        .find('.btnDeleteCourse')
        .click();

      waitForToast('Course deleted');
      cy.contains('.card .card-title', `${testCourse.name} EDITED`).should('not.exist');
    });
  });

  // ============================================================
  // SUITE 4 — STUDENT CRUD
  // ============================================================
  describe('4. Student CRUD, Search & Duplicate Handling', () => {
    before(() => {
      login();
      ensureCleanSlate();
    });

    beforeEach(() => {
      // Use conditional login
      cy.get('body').then($body => {
        if ($body.find('#adminPanel:visible').length === 0) {
          login();
        } else {
          waitForAppLoad();
        }
      });
    });

    it('Should Create, Check Duplicate ID, Search, and Delete a Student', () => {
      cy.log('Testing student CRUD operations...');
      
      // Create student
      cy.get('#stuId').type(testStudent.id);
      cy.get('#stuName').type(testStudent.name);
      cy.get('#stuPhone').type(testStudent.phone);
      cy.get('#stuEmail').type(testStudent.email);
      cy.get('#stuAddress').type(testStudent.address);
      cy.get('#studentForm button[type="submit"]').click();

      waitForToast('Student saved');
      cy.contains('#studentsList .card .card-title', testStudent.name, { timeout: 15000 }).should('be.visible');

      // Test duplicate prevention
      cy.get('#stuId').type(testStudent.id);
      cy.get('#stuName').type('Imposter Student');
      cy.get('#studentForm button[type="submit"]').click();
      waitForToast('Student ID already exists');

      // Test search
      cy.get('#studentSearch').type(testStudent.name);
      cy.contains('#studentsList .card .card-title', testStudent.name).should('be.visible');
      
      cy.get('#studentSearch').clear();

      // Delete student
      cy.contains('.card .card-title', testStudent.name)
        .parents('.card')
        .find('.btnDeleteStudent')
        .click();
        
      waitForToast('Student deleted');
      cy.contains('.card .card-title', testStudent.name).should('not.exist');
    });
  });

  // ============================================================
  // SUITE 5 — INTEGRATION WORKFLOW
  // ============================================================
  describe('5. Integration: Enrollment, Profile & Marks', () => {
    beforeEach(() => {
      // Use conditional login
      cy.get('body').then($body => {
        if ($body.find('#adminPanel:visible').length === 0) {
          login();
        } else {
          waitForAppLoad();
        }
      });
      ensureCleanSlate();
    });

    it('Should handle the full Student Lifecycle (Profile -> Enroll -> Marks -> Unenroll)', () => {
      cy.log('Testing full student lifecycle...');
      
      // Create test course
      cy.get('#courseName').type(testCourse.name);
      cy.get('#courseCredits').type('3');
      cy.get('#courseForm button[type="submit"]').click();
      waitForToast('Course added');

      // Create test student
      cy.get('#stuId').type(testStudent.id);
      cy.get('#stuName').type(testStudent.name);
      cy.get('#studentForm button[type="submit"]').click();
      waitForToast('Student saved');

      // Open student detail
      cy.contains('.card .card-title', testStudent.name)
        .parents('.card')
        .find('.btnEditProfile')
        .click();

      cy.get('#studentDetail').should('have.class', 'open');

      // Update profile
      cy.get('#detailPhone').clear().type('9999999999');
      cy.get('#saveProfile').click();
      waitForToast('Student info updated');

      // Enroll in course
      cy.contains('h4', 'Available Courses').should('be.visible');
      cy.contains('#detailContent .card', testCourse.name)
        .find('.enrollBtn')
        .click();
      waitForToast('Enrolled');

      // Update marks and attendance
      cy.contains('h4', 'Enrolled Courses').should('be.visible');
      cy.get('#detailContent input[id^="marks_"]').first().clear().type('85');
      cy.get('#detailContent input[id^="att_"]').first().clear().type('90');
      cy.get('.saveMarksBtn').first().click();
      waitForToast('Course data saved');

      // Unenroll
      cy.get('.unenrollBtn').first().click();
      waitForToast('Un-enrolled');

      // Close drawer
      cy.get('#closeDetail').click();
      cy.get('#studentDetail').should('not.have.class', 'open');
    });

    it('Should handle the Quick Enroll Popup', () => {
      cy.log('Testing quick enroll functionality...');
      
      // Create test course
      cy.get('#courseName').type(testCourse.name);
      cy.get('#courseCredits').type('3');
      cy.get('#courseForm button[type="submit"]').click();
      waitForToast('Course added');

      // Create test student
      cy.get('#stuId').type(testStudent.id);
      cy.get('#stuName').type(testStudent.name);
      cy.get('#studentForm button[type="submit"]').click();
      waitForToast('Student saved');

      // Use quick enroll
      cy.contains('.card .card-title', testCourse.name)
        .parents('.card')
        .find('.btnQuickEnroll')
        .click();

      cy.contains('h4', 'Select Student', { timeout: 10000 }).should('be.visible');
      cy.contains('button', testStudent.name).click();
      waitForToast('Enrolled');
      
      // Verify popup closed
      cy.contains('h4', 'Select Student').should('not.exist');
    });

    // =========================================================
    // FINAL CLEANUP
    // =========================================================
    after(() => {
      cy.log('Performing final cleanup...');
      cy.reload(); // Reload to ensure we have a fresh DOM for cleanup
      waitForAppLoad();
      ensureCleanSlate(); // Delete the test data so the DB stays clean
      cy.log('Final cleanup completed!');
    });
  });
});