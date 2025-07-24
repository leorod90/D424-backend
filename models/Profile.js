// Profile class (Encapsulation + Inheritance)
class Profile {
  // private fields (Encapsulation)
  #name;
  #skills;

  constructor(name, skills = []) {
    this.#name = name;
    this.#skills = Array.isArray(skills) ? skills : [];
  }

  // getters (Encapsulation)
  getName() {
    return this.#name;
  }

  getSkills() {
    return [...this.#skills]; 
  }

  // method to be overridden (Polymorphism)
  summary() {
    return `${this.#name} is a general employee with ${this.#skills.length} skills.`;
  }

  // method to be overridden (Polymorphism)  
  getRole() {
    return 'employee';
  }

  // common method
  addSkill(skill) {
    if (!this.#skills.includes(skill)) {
      this.#skills.push(skill);
    }
  }

  hasSkill(skill) {
    return this.#skills.includes(skill);
  }
}

// Employee Profile (Inheritance)
class EmployeeProfile extends Profile {
  // method override (Polymorphism)
  summary() {
    const skills = this.getSkills();
    if (skills.length === 0) {
      return `${this.getName()} is an employee looking to develop new skills.`;
    }
    return `${this.getName()} is an employee skilled in: ${skills.join(', ')}.`;
  }

  // method override (Polymorphism)
  getRole() {
    return 'employee';
  }
}

// admin Profile (Inheritance)
class AdminProfile extends Profile {
  // method override (Polymorphism)
  summary() {
    const skills = this.getSkills();
    return `${this.getName()} is an administrator with management responsibilities and expertise in: ${skills.join(', ')}.`;
  }

  // method override (Polymorphism)
  getRole() {
    return 'admin';
  }

  // admin method
  canManageUsers() {
    return true;
  }
}

// manager Profile (Inheritance - additional class)
class ManagerProfile extends Profile {
  #teamSize;

  constructor(name, skills = [], teamSize = 0) {
    super(name, skills); // Call parent constructor (Inheritance)
    this.#teamSize = teamSize;
  }

  // method override (Polymorphism)
  summary() {
    const skills = this.getSkills();
    return `${this.getName()} is a manager leading ${this.#teamSize} team members with skills in: ${skills.join(', ')}.`;
  }

  // method override (Polymorphism)
  getRole() {
    return 'manager';
  }

  getTeamSize() {
    return this.#teamSize;
  }

  setTeamSize(size) {
    if (size >= 0) {
      this.#teamSize = size;
    }
  }
}

// factory Pattern (additional OOP concept)
class ProfileFactory {
  static createProfile(role, name, skills, extra) {
    switch (role.toLowerCase()) {
      case 'admin':
        return new AdminProfile(name, skills);
      case 'manager':
        return new ManagerProfile(name, skills, extra);
      case 'employee':
      default:
        return new EmployeeProfile(name, skills);
    }
  }
}

module.exports = {
  Profile,
  EmployeeProfile,
  AdminProfile,
  ManagerProfile,
  ProfileFactory
};