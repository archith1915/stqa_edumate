describe('Edumate Admin Panel Comprehensive Tests', () => {
  // =========================================================
  // CONSTANTS (STATIC DATA)
  // =========================================================
  const testCourse = {
    name: 'Cypress Full Test Course',
    credits: 4,
    category: 'Testing 101',
    desc: 'Full coverage test data'
  };
  
  const testStudent = {
    id: 'STU_FULL_TEST',
    name: 'Cypress Full User',
    phone: '1234567890',
    email: 'fulltest@cypress.io',
    address: '123 Full Coverage Lane'
  };

  // =========================================================
  // HELPER: SYNCHRONIZATION
  // =========================================================
  
  // 1. Wait for App Load
  const waitForAppLoad = () => {
    // Wait for the grid or list to exist in DOM
    cy.get('#coursesGrid, #studentsList', { timeout: 15000 }).should('exist');
    // Wait for Firestore to return *something* (either cards or the "No data" text)
    // This ensures we don't act before the initial fetch is done.
    cy.get('.card, p', { timeout: 15000 }).should('exist');
  };

  // 2. Nuclear Cleanup (Ensures clean slate before specific blocks)
  const ensureCleanSlate = () => {
    cy.get('body').then(($body) => {
      // Delete Student if exists
      if ($body.find(`.card:contains("${testStudent.name}")`).length > 0) {
         cy.contains('.card', testStudent.name).find('.btnDeleteStudent').click();
         cy.contains('.toast', 'Student deleted', { timeout: 10000 }).should('be.visible');
         cy.wait(1000); // Allow Firestore to sync
      }
      // Delete Course if exists
      if ($body.find(`.card:contains("${testCourse.name}")`).length > 0) {
         cy.contains('.card', testCourse.name).find('.btnDeleteCourse').click();
         cy.contains('.toast', 'Course deleted', { timeout: 10000 }).should('be.visible');
         cy.wait(1000);
      }
    });
  };

  beforeEach(() => {
    cy.visit('/');
    waitForAppLoad();
  });

  // =========================================================
  // SUITE 1: VALIDATION LOGIC (Negative Testing)
  // =========================================================
  describe('1. Input Validation Logic', () => {
    
    it('Should validate Course inputs', () => {
      // Case 1: Empty Name
      cy.get('#courseForm button[type="submit"]').click();
      cy.contains('.toast', 'Name required').should('be.visible');

      // Case 2: Invalid Credits (Negative)
      cy.get('#courseName').type('Bad Course');
      cy.get('#courseCredits').type('-5');
      cy.get('#courseForm button[type="submit"]').click();
      cy.contains('.toast', 'Invalid credits').should('be.visible');

      // Case 3: Clear Button works
      cy.get('#courseClear').click();
      cy.get('#courseName').should('have.value', '');
      cy.get('#courseCredits').should('have.value', '');
    });

    it('Should validate Student inputs', () => {
      // Case 1: Missing ID/Name
      cy.get('#studentForm button[type="submit"]').click();
      cy.contains('.toast', 'ID + Name required').should('be.visible');

      // Case 2: Invalid Phone
      cy.get('#stuId').type('TEMP');
      cy.get('#stuName').type('Temp');
      cy.get('#stuPhone').type('123'); // Too short
      cy.get('#studentForm button[type="submit"]').click();
      cy.contains('.toast', 'Phone must be 10 digits').should('be.visible');
      cy.get('#stuPhone').clear();

      // Case 3: Invalid Email
      cy.get('#stuEmail').type('bad-email');
      cy.get('#studentForm button[type="submit"]').click();
      cy.contains('.toast', 'Invalid email').should('be.visible');
    });
  });

  // =========================================================
  // SUITE 2: COURSE CRUD OPERATIONS
  // =========================================================
  describe('2. Course CRUD & Duplicate Handling', () => {
    
    // Cleanup before this suite starts to ensure no duplicates
    before(() => {
      cy.visit('/');
      waitForAppLoad();
      ensureCleanSlate();
    });

    it('Should Create, Check Duplicate, Edit, and Delete a Course', () => {
      // --- CREATE ---
      cy.get('#courseName').type(testCourse.name);
      cy.get('#courseCredits').type(testCourse.credits);
      cy.get('#courseCategory').type(testCourse.category);
      cy.get('#courseDesc').type(testCourse.desc);
      cy.get('#courseForm button[type="submit"]').click();

      // Verify Success
      cy.contains('.toast', 'Course added').should('be.visible');
      cy.contains('#coursesGrid .card', testCourse.name, { timeout: 15000 }).should('be.visible');

      // --- DUPLICATE CHECK ---
      cy.get('#courseName').type(testCourse.name);
      cy.get('#courseCredits').type('3');
      cy.get('#courseForm button[type="submit"]').click();
      
      // Verify Error
      cy.contains('.toast', 'Course already exists').should('be.visible');
      cy.get('#courseClear').click();

      // --- UPDATE ---
      cy.contains('.card', testCourse.name).within(() => {
        cy.get('.btnEditCourse').click();
      });

      // Verify form population
      cy.get('#courseName').should('have.value', testCourse.name);
      // Change value
      cy.get('#courseName').clear().type(`${testCourse.name} EDITED`);
      cy.get('#courseForm button[type="submit"]').click();
      
      // Verify Update
      cy.contains('.toast', 'Course updated').should('be.visible');
      cy.contains('#coursesGrid .card', `${testCourse.name} EDITED`, { timeout: 15000 }).should('be.visible');

      // --- DELETE ---
      // Stub the confirm dialog
      cy.on('window:confirm', () => true);
      
      cy.contains('.card', `${testCourse.name} EDITED`).within(() => {
        cy.get('.btnDeleteCourse').click();
      });

      // Verify Deletion
      cy.contains('.toast', 'Course deleted').should('be.visible');
      cy.contains('#coursesGrid .card', `${testCourse.name} EDITED`).should('not.exist');
    });
  });

  // =========================================================
  // SUITE 3: STUDENT CRUD OPERATIONS
  // =========================================================
  describe('3. Student CRUD, Search & Duplicate Handling', () => {
    
    before(() => {
      cy.visit('/');
      waitForAppLoad();
      ensureCleanSlate();
    });

    it('Should Create, Check Duplicate ID, Search, and Delete a Student', () => {
      // --- CREATE ---
      cy.get('#stuId').type(testStudent.id);
      cy.get('#stuName').type(testStudent.name);
      cy.get('#stuPhone').type(testStudent.phone);
      cy.get('#stuEmail').type(testStudent.email);
      cy.get('#stuAddress').type(testStudent.address);
      cy.get('#studentForm button[type="submit"]').click();

      // Verify Success
      cy.contains('.toast', 'Student saved').should('be.visible');
      cy.contains('#studentsList .card', testStudent.name, { timeout: 15000 }).should('be.visible');

      // --- DUPLICATE CHECK ---
      // We must reload to clear the form state for a true duplicate ID check
      cy.reload(); waitForAppLoad();
      
      cy.get('#stuId').type(testStudent.id); // Same ID
      cy.get('#stuName').type('Imposter Student'); // Diff Name
      cy.get('#studentForm button[type="submit"]').click();

      // Verify Error
      cy.contains('.toast', 'Student ID already exists').should('be.visible');

      // --- SEARCH FUNCTIONALITY ---
      cy.get('#studentSearch').type(testStudent.id);
      // List should contain our student
      cy.contains('#studentsList .card', testStudent.name).should('be.visible');
      // Ensure it doesn't show 50 other students (rough check)
      cy.get('#studentsList .card').should('have.length.lessThan', 5);

      // --- DELETE ---
      cy.on('window:confirm', () => true);
      cy.get('#studentSearch').clear(); // Clear search to see the card to delete it
      
      cy.contains('#studentsList .card', testStudent.name, { timeout: 10000 }).within(() => {
        cy.get('.btnDeleteStudent').click();
      });

      cy.contains('.toast', 'Student deleted').should('be.visible');
      cy.contains('#studentsList .card', testStudent.name).should('not.exist');
    });
  });

  // =========================================================
  // SUITE 4: INTEGRATION (ENROLLMENT/DRAWER/MARKS)
  // =========================================================
  describe('4. Integration: Enrollment, Profile & Marks', () => {
    
    // For integration, we need specific data. We create it if missing.
    // This allows this suite to run standalone even if previous suites failed.
    it('Should handle the full Student Lifecycle (Profile -> Enroll -> Marks -> Unenroll)', () => {
      
      // 1. SETUP DATA
      cy.get('body').then(($body) => {
        // Create Course if missing
        if ($body.find(`.card:contains("${testCourse.name}")`).length === 0) {
          cy.get('#courseName').type(testCourse.name);
          cy.get('#courseCredits').type('3');
          cy.get('#courseForm button[type="submit"]').click();
          cy.contains('.toast', 'Course added').should('be.visible');
        }
        // Create Student if missing
        if ($body.find(`.card:contains("${testStudent.name}")`).length === 0) {
          cy.get('#stuId').type(testStudent.id);
          cy.get('#stuName').type(testStudent.name);
          cy.get('#studentForm button[type="submit"]').click();
          cy.contains('.toast', 'Student saved').should('be.visible');
        }
      });

      // 2. OPEN DRAWER
      // Use specific wait to ensure card is rendered
      cy.contains('#studentsList .card', testStudent.name, { timeout: 15000 }).within(() => {
        cy.get('.btnEditProfile').click();
      });
      cy.get('#studentDetail').should('have.class', 'open');

      // 3. EDIT PROFILE INSIDE DRAWER
      cy.get('#detailPhone').clear().type('9999999999');
      cy.get('#saveProfile').click();
      cy.contains('.toast', 'Student info updated').should('be.visible');

      // 4. ENROLLMENT
      cy.contains('h4', 'Available Courses').should('be.visible');
      
      // Find course card specifically within drawer content
      cy.contains('#detailContent .card', testCourse.name, { timeout: 10000 }).as('drawerCourse');
      
      cy.get('@drawerCourse').within(() => {
        cy.get('.enrollBtn').click();
      });
      cy.contains('.toast', 'Enrolled').should('be.visible');

      // 5. MARKS ENTRY
      cy.contains('h4', 'Enrolled Courses').should('be.visible');
      
      // Wait for input rendering
      cy.get('#detailContent input[id^="marks_"]', { timeout: 10000 }).first().as('marksInput');
      cy.get('@marksInput').clear().type('85');
      
      cy.get('#detailContent input[id^="att_"]').first().clear().type('90');
      
      cy.get('.saveMarksBtn').first().click();
      cy.contains('.toast', 'Course data saved').should('be.visible');

      // 6. UN-ENROLLMENT
      cy.get('.unenrollBtn').first().click();
      cy.contains('.toast', 'Un-enrolled').should('be.visible');
      
      // Verify it returns to Available section
      cy.contains('#detailContent .card', testCourse.name).should('be.visible');

      // Close Drawer
      cy.get('#closeDetail').click();
      cy.get('#studentDetail').should('not.have.class', 'open');
    });

    it('Should handle the Quick Enroll Popup', () => {
      // 1. SETUP (Ensure data exists)
      cy.get('body').then(($body) => {
         if ($body.find(`.card:contains("${testCourse.name}")`).length === 0) {
           cy.get('#courseName').type(testCourse.name);
           cy.get('#courseCredits').type('3');
           cy.get('#courseForm button[type="submit"]').click();
           cy.contains('.toast', 'Course added').should('be.visible');
         }
         if ($body.find(`.card:contains("${testStudent.name}")`).length === 0) {
           cy.get('#stuId').type(testStudent.id);
           cy.get('#stuName').type(testStudent.name);
           cy.get('#studentForm button[type="submit"]').click();
           cy.contains('.toast', 'Student saved').should('be.visible');
         }
      });

      // 2. OPEN QUICK ENROLL
      cy.contains('#coursesGrid .card', testCourse.name, { timeout: 15000 }).within(() => {
        cy.get('.btnQuickEnroll').click();
      });

      // 3. SELECT STUDENT
      cy.get('h4').contains('Select Student').should('be.visible');
      cy.contains('button', testStudent.name, { timeout: 10000 }).click();

      // 4. VERIFY
      cy.contains('.toast', 'Enrolled').should('be.visible');
      cy.contains('h4', 'Select Student').should('not.exist');
    });

    // =========================================================
    // FINAL CLEANUP
    // =========================================================
    after(() => {
      cy.reload(); // Reload to ensure we have a fresh DOM for cleanup
      waitForAppLoad();
      ensureCleanSlate(); // Delete the test data so the DB stays clean
    });
  });
});