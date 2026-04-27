// Test user profiles — realistic Indian users across different demographics.
// Each user is used by a specific test suite.
// Passwords are test-only — bcrypt hashed at runtime by the test runner.

const TEST_USERS = {

    // Primary Mode A user — used by auth + chat suites
    arjun: {
        name:          "Arjun Sharma",
        preferredName: "Arjun",
        email:         "arjun.test.aria@mailinator.com",
        password:      "TestPass@123",
        age:           19,
        city:          "Kota",
        encryptionMode: "A",
        reportOptIn:   true
    },

    // Mode B user — used by chat-b suite
    priya: {
        name:          "Priya Menon",
        preferredName: "Priya",
        email:         "priya.test.aria@mailinator.com",
        password:      "TestPass@456",
        age:           28,
        city:          "Bengaluru",
        encryptionMode: "B",
        reportOptIn:   false
    },

    // Performance test user — chat concurrency
    rahul: {
        name:          "Rahul Verma",
        preferredName: "Rahul",
        email:         "rahul.test.aria@mailinator.com",
        password:      "TestPass@789",
        age:           35,
        city:          "Mumbai",
        encryptionMode: "A",
        reportOptIn:   false
    }
};

module.exports = { TEST_USERS };
