import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// ─── Date helpers ───────────────────────────────────
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding database...');

  // ─── Clear existing data (reverse dependency order) ──
  console.log('Clearing existing data...');
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.adminActivityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pointsTransaction.deleteMany();
  await prisma.insuranceDocument.deleteMany();
  await prisma.insuranceApplication.deleteMany();
  await prisma.medicalTourismEnquiry.deleteMany();
  await prisma.medicalTourismPackage.deleteMany();
  await prisma.medicalTourismTreatment.deleteMany();
  await prisma.medicalTourismHospital.deleteMany();
  await prisma.telemedicineConsultation.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.labBooking.deleteMany();
  await prisma.labPackageTest.deleteMany();
  await prisma.labPackage.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.lab.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.document.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.medicineCategory.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.pointsRule.deleteMany();
  await prisma.insurancePlan.deleteMany();
  await prisma.otpRequest.deleteMany();
  await prisma.refreshToken.deleteMany();

  // ─── Hash password ────────────────────────────────────
  const passwordHash = await argon2.hash('Admin@123');

  // ════════════════════════════════════════════════════════
  // 1. ADMIN USERS (3)
  // ════════════════════════════════════════════════════════
  console.log('Creating admin users...');

  const superAdmin = await prisma.admin.create({
    data: {
      email: 'admin@divyajivan.com',
      phone: '9000000001',
      passwordHash,
      name: 'Divy Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      lastLoginAt: daysAgo(0),
    },
  });

  const adminUser = await prisma.admin.create({
    data: {
      email: 'priya@divyajivan.com',
      phone: '9000000002',
      passwordHash,
      name: 'Priya Manager',
      role: 'ADMIN',
      status: 'ACTIVE',
      lastLoginAt: daysAgo(1),
    },
  });

  const staffUser = await prisma.admin.create({
    data: {
      email: 'rahul@divyajivan.com',
      phone: '9000000003',
      passwordHash,
      name: 'Rahul Staff',
      role: 'STAFF',
      status: 'ACTIVE',
      lastLoginAt: daysAgo(2),
    },
  });

  // ════════════════════════════════════════════════════════
  // 2. MEDICINE CATEGORIES (5)
  // ════════════════════════════════════════════════════════
  console.log('Creating medicine categories...');

  const catGeneral = await prisma.medicineCategory.create({
    data: { name: 'General' },
  });
  const catPainRelief = await prisma.medicineCategory.create({
    data: { name: 'Pain Relief' },
  });
  const catVitamins = await prisma.medicineCategory.create({
    data: { name: 'Vitamins' },
  });
  const catAntibiotics = await prisma.medicineCategory.create({
    data: { name: 'Antibiotics' },
  });
  const catDigestive = await prisma.medicineCategory.create({
    data: { name: 'Digestive' },
  });

  // ════════════════════════════════════════════════════════
  // 3. MEDICINES (10)
  // ════════════════════════════════════════════════════════
  console.log('Creating medicines...');

  const medParacetamol = await prisma.medicine.create({
    data: {
      name: 'Paracetamol 500mg',
      categoryId: catGeneral.id,
      brand: 'Crocin',
      description: 'Fever and pain relief tablets. Pack of 15 tablets.',
      price: 35,
      discountPercent: 5,
      stock: 200,
      prescriptionRequired: false,
    },
  });

  const medAmoxicillin = await prisma.medicine.create({
    data: {
      name: 'Amoxicillin 500mg',
      categoryId: catAntibiotics.id,
      brand: 'Mox',
      description: 'Broad-spectrum antibiotic capsules. Strip of 10.',
      price: 120,
      discountPercent: 0,
      stock: 80,
      prescriptionRequired: true,
    },
  });

  const medVitaminD3 = await prisma.medicine.create({
    data: {
      name: 'Vitamin D3 60000 IU',
      categoryId: catVitamins.id,
      brand: 'D-Rise',
      description: 'Cholecalciferol soft gelatin capsules. Strip of 8.',
      price: 250,
      discountPercent: 10,
      stock: 150,
      prescriptionRequired: false,
    },
  });

  const medOmeprazole = await prisma.medicine.create({
    data: {
      name: 'Omeprazole 20mg',
      categoryId: catDigestive.id,
      brand: 'Omez',
      description: 'Gastro-resistant capsules for acidity. Strip of 15.',
      price: 85,
      discountPercent: 0,
      stock: 5,
      prescriptionRequired: false,
    },
  });

  const medIbuprofen = await prisma.medicine.create({
    data: {
      name: 'Ibuprofen 400mg',
      categoryId: catPainRelief.id,
      brand: 'Brufen',
      description: 'Anti-inflammatory pain relief tablets. Strip of 10.',
      price: 45,
      discountPercent: 0,
      stock: 120,
      prescriptionRequired: false,
    },
  });

  const medAzithromycin = await prisma.medicine.create({
    data: {
      name: 'Azithromycin 500mg',
      categoryId: catAntibiotics.id,
      brand: 'Azee',
      description: 'Macrolide antibiotic tablets. Strip of 3.',
      price: 95,
      discountPercent: 5,
      stock: 60,
      prescriptionRequired: true,
    },
  });

  const medMultivitamin = await prisma.medicine.create({
    data: {
      name: 'Multivitamin Tablets',
      categoryId: catVitamins.id,
      brand: 'Revital H',
      description: 'Daily health supplement. Bottle of 30 tablets.',
      price: 350,
      discountPercent: 15,
      stock: 90,
      prescriptionRequired: false,
    },
  });

  const medCetirizine = await prisma.medicine.create({
    data: {
      name: 'Cetirizine 10mg',
      categoryId: catGeneral.id,
      brand: 'Cetzine',
      description: 'Antihistamine for allergy relief. Strip of 10.',
      price: 30,
      discountPercent: 0,
      stock: 300,
      prescriptionRequired: false,
    },
  });

  const medPantoprazole = await prisma.medicine.create({
    data: {
      name: 'Pantoprazole 40mg',
      categoryId: catDigestive.id,
      brand: 'Pan-D',
      description: 'Proton pump inhibitor capsules. Strip of 15.',
      price: 110,
      discountPercent: 0,
      stock: 0,
      prescriptionRequired: true,
    },
  });

  const medDiclofenac = await prisma.medicine.create({
    data: {
      name: 'Diclofenac Gel 30g',
      categoryId: catPainRelief.id,
      brand: 'Voveran Emulgel',
      description: 'Topical pain relief gel for joint and muscle pain.',
      price: 140,
      discountPercent: 10,
      stock: 45,
      prescriptionRequired: false,
    },
  });

  // ════════════════════════════════════════════════════════
  // 4. DOCTORS (5)
  // ════════════════════════════════════════════════════════
  console.log('Creating doctors...');

  const drArun = await prisma.doctor.create({
    data: {
      name: 'Dr. Arun Sharma',
      specialization: 'Cardiologist',
      qualification: 'MBBS, MD (Cardiology)',
      experience: 15,
      phone: '9800000001',
      email: 'arun.sharma@divyajivan.com',
      consultationFee: 800,
      hospital: 'Divyajivan Heart Centre',
      bio: 'Senior cardiologist with 15 years of experience in interventional cardiology and cardiac care.',
      status: 'ACTIVE',
      availability: {
        create: [
          { day: 'MONDAY', startTime: '09:00', endTime: '13:00' },
          { day: 'MONDAY', startTime: '16:00', endTime: '19:00' },
          { day: 'WEDNESDAY', startTime: '09:00', endTime: '13:00' },
          { day: 'WEDNESDAY', startTime: '16:00', endTime: '19:00' },
          { day: 'FRIDAY', startTime: '09:00', endTime: '14:00' },
        ],
      },
    },
  });

  const drMeera = await prisma.doctor.create({
    data: {
      name: 'Dr. Meera Patel',
      specialization: 'Dermatologist',
      qualification: 'MBBS, MD (Dermatology)',
      experience: 10,
      phone: '9800000002',
      email: 'meera.patel@divyajivan.com',
      consultationFee: 600,
      hospital: 'Divyajivan Skin & Hair Clinic',
      bio: 'Dermatologist specializing in cosmetic dermatology, acne treatment, and skin allergies.',
      status: 'ACTIVE',
      availability: {
        create: [
          { day: 'MONDAY', startTime: '10:00', endTime: '14:00' },
          { day: 'TUESDAY', startTime: '10:00', endTime: '14:00' },
          { day: 'THURSDAY', startTime: '10:00', endTime: '14:00' },
          { day: 'FRIDAY', startTime: '10:00', endTime: '14:00' },
        ],
      },
    },
  });

  const drRajesh = await prisma.doctor.create({
    data: {
      name: 'Dr. Rajesh Kumar',
      specialization: 'Orthopedic',
      qualification: 'MBBS, MS (Orthopedics)',
      experience: 20,
      phone: '9800000003',
      email: 'rajesh.kumar@divyajivan.com',
      consultationFee: 1000,
      hospital: 'Divyajivan Bone & Joint Hospital',
      bio: 'Senior orthopedic surgeon with expertise in joint replacement and sports medicine.',
      status: 'ACTIVE',
      availability: {
        create: [
          { day: 'TUESDAY', startTime: '09:00', endTime: '13:00' },
          { day: 'TUESDAY', startTime: '15:00', endTime: '18:00' },
          { day: 'THURSDAY', startTime: '09:00', endTime: '13:00' },
          { day: 'THURSDAY', startTime: '15:00', endTime: '18:00' },
          { day: 'SATURDAY', startTime: '09:00', endTime: '12:00' },
        ],
      },
    },
  });

  const drAnjali = await prisma.doctor.create({
    data: {
      name: 'Dr. Anjali Reddy',
      specialization: 'Pediatrician',
      qualification: 'MBBS, DCH',
      experience: 8,
      phone: '9800000004',
      email: 'anjali.reddy@divyajivan.com',
      consultationFee: 500,
      hospital: 'Divyajivan Children Hospital',
      bio: 'Pediatrician specializing in newborn care, childhood vaccinations, and growth disorders.',
      status: 'ACTIVE',
      availability: {
        create: [
          { day: 'MONDAY', startTime: '09:00', endTime: '17:00' },
          { day: 'WEDNESDAY', startTime: '09:00', endTime: '17:00' },
          { day: 'FRIDAY', startTime: '09:00', endTime: '17:00' },
        ],
      },
    },
  });

  const drVikram = await prisma.doctor.create({
    data: {
      name: 'Dr. Vikram Singh',
      specialization: 'General Physician',
      qualification: 'MBBS',
      experience: 12,
      phone: '9800000005',
      email: 'vikram.singh@divyajivan.com',
      consultationFee: 400,
      hospital: 'Divyajivan Health Clinic',
      bio: 'General physician with broad experience in treating common illnesses, chronic disease management, and preventive health.',
      status: 'ACTIVE',
      availability: {
        create: [
          { day: 'MONDAY', startTime: '08:00', endTime: '12:00' },
          { day: 'TUESDAY', startTime: '08:00', endTime: '12:00' },
          { day: 'WEDNESDAY', startTime: '08:00', endTime: '12:00' },
          { day: 'THURSDAY', startTime: '08:00', endTime: '12:00' },
          { day: 'FRIDAY', startTime: '08:00', endTime: '12:00' },
        ],
      },
    },
  });

  // ════════════════════════════════════════════════════════
  // 5. PATIENTS (10)
  // ════════════════════════════════════════════════════════
  console.log('Creating patients...');

  const patientPasswordHash = await argon2.hash('Patient@123');

  const patient1 = await prisma.patient.create({
    data: {
      name: 'Arjun Mehta',
      email: 'arjun.mehta@email.com',
      phone: '9876543210',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'MALE',
      address: '12, Nehru Nagar',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
      passwordHash: patientPasswordHash,
      pointsBalance: 450,
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: 'Sneha Gupta',
      email: 'sneha.gupta@email.com',
      phone: '8765432109',
      dateOfBirth: new Date('1985-11-22'),
      gender: 'FEMALE',
      address: '45, MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      passwordHash: patientPasswordHash,
      pointsBalance: 1200,
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      name: 'Kiran Desai',
      email: 'kiran.desai@email.com',
      phone: '7654321098',
      dateOfBirth: new Date('1978-03-08'),
      gender: 'MALE',
      address: '78, Sardar Patel Road',
      city: 'Surat',
      state: 'Gujarat',
      pincode: '395007',
      passwordHash: patientPasswordHash,
      pointsBalance: 200,
    },
  });

  const patient4 = await prisma.patient.create({
    data: {
      name: 'Priya Nair',
      email: 'priya.nair@email.com',
      phone: '9988776655',
      dateOfBirth: new Date('1992-08-14'),
      gender: 'FEMALE',
      address: '23, Anna Salai',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600002',
      passwordHash: patientPasswordHash,
      pointsBalance: 800,
    },
  });

  const patient5 = await prisma.patient.create({
    data: {
      name: 'Rohit Sharma',
      phone: '9123456789',
      dateOfBirth: new Date('1988-12-01'),
      gender: 'MALE',
      address: '56, Lal Darwaja',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380001',
      passwordHash: patientPasswordHash,
      pointsBalance: 0,
    },
  });

  const patient6 = await prisma.patient.create({
    data: {
      name: 'Kavita Joshi',
      email: 'kavita.joshi@email.com',
      phone: '8899001122',
      dateOfBirth: new Date('1995-06-30'),
      gender: 'FEMALE',
      address: '90, Baner Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411045',
      passwordHash: patientPasswordHash,
      pointsBalance: 350,
    },
  });

  const patient7 = await prisma.patient.create({
    data: {
      name: 'Amit Thakur',
      phone: '7788990011',
      dateOfBirth: new Date('1970-09-25'),
      gender: 'MALE',
      address: '15, Civil Lines',
      city: 'Vadodara',
      state: 'Gujarat',
      pincode: '390001',
      passwordHash: patientPasswordHash,
      pointsBalance: 100,
    },
  });

  const patient8 = await prisma.patient.create({
    data: {
      name: 'Deepika Rao',
      email: 'deepika.rao@email.com',
      phone: '9012345678',
      dateOfBirth: new Date('1998-01-18'),
      gender: 'FEMALE',
      address: '34, Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      passwordHash: patientPasswordHash,
      pointsBalance: 600,
    },
  });

  const patient9 = await prisma.patient.create({
    data: {
      name: 'Suresh Patel',
      phone: '8800112233',
      dateOfBirth: new Date('1965-04-10'),
      gender: 'MALE',
      address: '67, CG Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380006',
      passwordHash: patientPasswordHash,
      pointsBalance: 50,
    },
  });

  const patient10 = await prisma.patient.create({
    data: {
      name: 'Ananya Iyer',
      email: 'ananya.iyer@email.com',
      phone: '7700889966',
      dateOfBirth: new Date('2000-07-05'),
      gender: 'FEMALE',
      address: '102, T Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600017',
      passwordHash: patientPasswordHash,
      pointsBalance: 0,
    },
  });

  const patients = [patient1, patient2, patient3, patient4, patient5, patient6, patient7, patient8, patient9, patient10];

  // ─── Family Members (for patients 1, 2, 3) ───────────
  console.log('Creating family members...');

  await prisma.familyMember.createMany({
    data: [
      {
        patientId: patient1.id,
        name: 'Sonal Mehta',
        relation: 'Wife',
        dateOfBirth: new Date('1993-02-20'),
        gender: 'FEMALE',
        phone: '9876543211',
      },
      {
        patientId: patient1.id,
        name: 'Aarav Mehta',
        relation: 'Son',
        dateOfBirth: new Date('2018-08-10'),
        gender: 'MALE',
      },
      {
        patientId: patient2.id,
        name: 'Ramesh Gupta',
        relation: 'Father',
        dateOfBirth: new Date('1955-06-15'),
        gender: 'MALE',
        phone: '8765432100',
      },
      {
        patientId: patient3.id,
        name: 'Nisha Desai',
        relation: 'Wife',
        dateOfBirth: new Date('1980-12-03'),
        gender: 'FEMALE',
        phone: '7654321099',
      },
      {
        patientId: patient3.id,
        name: 'Riya Desai',
        relation: 'Daughter',
        dateOfBirth: new Date('2010-04-22'),
        gender: 'FEMALE',
      },
    ],
  });

  // ════════════════════════════════════════════════════════
  // 6. LABS (2)
  // ════════════════════════════════════════════════════════
  console.log('Creating labs...');

  const lab1 = await prisma.lab.create({
    data: {
      name: 'Divyajivan Diagnostics',
      address: '5th Floor, Divyajivan Health Complex, SG Highway, Ahmedabad',
      phone: '07926300100',
      email: 'diagnostics@divyajivan.com',
      status: 'ACTIVE',
    },
  });

  const lab2 = await prisma.lab.create({
    data: {
      name: 'City Health Lab',
      address: '12, Panchvati, Ambawadi, Ahmedabad',
      phone: '07926400200',
      email: 'info@cityhealthlab.com',
      status: 'ACTIVE',
    },
  });

  // ════════════════════════════════════════════════════════
  // 7. LAB TESTS (8)
  // ════════════════════════════════════════════════════════
  console.log('Creating lab tests...');

  const testCBC = await prisma.labTest.create({
    data: {
      name: 'Complete Blood Count (CBC)',
      category: 'Haematology',
      description: 'Measures red blood cells, white blood cells, haemoglobin, platelets, and related indices.',
      price: 350,
      homeCollection: true,
      labId: lab1.id,
    },
  });

  const testThyroid = await prisma.labTest.create({
    data: {
      name: 'Thyroid Profile (T3, T4, TSH)',
      category: 'Endocrinology',
      description: 'Evaluates thyroid gland function by measuring T3, T4, and TSH levels.',
      price: 600,
      homeCollection: true,
      labId: lab1.id,
    },
  });

  const testLipid = await prisma.labTest.create({
    data: {
      name: 'Lipid Profile',
      category: 'Biochemistry',
      description: 'Measures cholesterol, triglycerides, HDL, LDL, and VLDL levels.',
      price: 500,
      homeCollection: true,
      labId: lab1.id,
    },
  });

  const testLiver = await prisma.labTest.create({
    data: {
      name: 'Liver Function Test (LFT)',
      category: 'Biochemistry',
      description: 'Assesses liver health by measuring bilirubin, SGOT, SGPT, alkaline phosphatase, and proteins.',
      price: 550,
      homeCollection: false,
      labId: lab1.id,
    },
  });

  const testKidney = await prisma.labTest.create({
    data: {
      name: 'Kidney Function Test (KFT)',
      category: 'Biochemistry',
      description: 'Evaluates kidney function by measuring creatinine, urea, uric acid, and electrolytes.',
      price: 500,
      homeCollection: false,
      labId: lab2.id,
    },
  });

  const testBloodSugar = await prisma.labTest.create({
    data: {
      name: 'Blood Sugar (Fasting & PP)',
      category: 'Biochemistry',
      description: 'Measures fasting and post-prandial blood glucose levels for diabetes screening.',
      price: 200,
      homeCollection: true,
      labId: lab2.id,
    },
  });

  const testUrine = await prisma.labTest.create({
    data: {
      name: 'Urine Analysis (Routine)',
      category: 'Pathology',
      description: 'Complete urine examination including physical, chemical, and microscopic analysis.',
      price: 150,
      homeCollection: false,
      labId: lab2.id,
    },
  });

  const testVitaminD = await prisma.labTest.create({
    data: {
      name: 'Vitamin D Test (25-OH)',
      category: 'Biochemistry',
      description: 'Measures 25-hydroxyvitamin D levels to assess vitamin D status.',
      price: 800,
      discountPercent: 10,
      homeCollection: true,
      labId: lab1.id,
    },
  });

  // ════════════════════════════════════════════════════════
  // 8. LAB PACKAGES (2)
  // ════════════════════════════════════════════════════════
  console.log('Creating lab packages...');

  const basicPackage = await prisma.labPackage.create({
    data: {
      name: 'Basic Health Checkup',
      description: 'Essential tests for routine health screening including blood count, blood sugar, and urine analysis.',
      price: 599,
      discountPercent: 15,
    },
  });

  const comprehensivePackage = await prisma.labPackage.create({
    data: {
      name: 'Comprehensive Health Package',
      description: 'Thorough health assessment covering blood work, organ function, thyroid, lipids, and vitamin D levels.',
      price: 1999,
      discountPercent: 25,
    },
  });

  // Link tests to packages
  await prisma.labPackageTest.createMany({
    data: [
      // Basic: CBC, Blood Sugar, Urine Analysis
      { packageId: basicPackage.id, testId: testCBC.id },
      { packageId: basicPackage.id, testId: testBloodSugar.id },
      { packageId: basicPackage.id, testId: testUrine.id },
      // Comprehensive: CBC, Thyroid, Lipid, Liver, Kidney
      { packageId: comprehensivePackage.id, testId: testCBC.id },
      { packageId: comprehensivePackage.id, testId: testThyroid.id },
      { packageId: comprehensivePackage.id, testId: testLipid.id },
      { packageId: comprehensivePackage.id, testId: testLiver.id },
      { packageId: comprehensivePackage.id, testId: testKidney.id },
    ],
  });

  // ════════════════════════════════════════════════════════
  // 9. INSURANCE PLANS (3)
  // ════════════════════════════════════════════════════════
  console.log('Creating insurance plans...');

  const insurPlanHealth = await prisma.insurancePlan.create({
    data: {
      name: 'Health Plan',
      description: 'Basic health insurance plan covering hospitalisation, day-care procedures, and pre/post hospitalisation expenses.',
      premium: 5000,
      coverage: 500000,
      duration: 12,
      features: [
        'Cashless hospitalisation at 500+ network hospitals',
        'Pre and post hospitalisation cover (30/60 days)',
        'Day-care procedures covered',
        'Annual health checkup',
        'No room rent capping',
      ],
    },
  });

  const insurPlanCritical = await prisma.insurancePlan.create({
    data: {
      name: 'Critical Illness',
      description: 'Comprehensive coverage for critical illnesses including cancer, heart attack, kidney failure, and major organ transplants.',
      premium: 8000,
      coverage: 1000000,
      duration: 12,
      features: [
        'Covers 30+ critical illnesses',
        'Lump sum payout on diagnosis',
        'No sub-limits on treatment costs',
        'Second opinion benefit',
        'International coverage',
        'Restoration benefit',
      ],
    },
  });

  const insurPlanCover = await prisma.insurancePlan.create({
    data: {
      name: 'Cover Your Health',
      description: 'Premium family floater plan with high sum insured, covering entire family under a single policy.',
      premium: 12000,
      coverage: 2000000,
      duration: 12,
      features: [
        'Family floater option (self + spouse + 2 children)',
        'Maternity and newborn cover',
        'Alternative treatments (Ayurveda, Homeopathy)',
        'Domiciliary hospitalisation',
        'Organ donor expenses',
        'Automatic restoration of sum insured',
        'Global emergency cover',
        'Personal accident cover',
      ],
    },
  });

  // ════════════════════════════════════════════════════════
  // 10. MEMBERSHIP PLANS (4)
  // ════════════════════════════════════════════════════════
  console.log('Creating membership plans...');

  const memberSilver = await prisma.membershipPlan.create({
    data: {
      name: 'Silver',
      price: 999,
      duration: 3,
      benefits: [
        '5% discount on medicines',
        'Free delivery on orders above Rs 500',
        'Priority customer support',
      ],
    },
  });

  const memberGold = await prisma.membershipPlan.create({
    data: {
      name: 'Gold',
      price: 2499,
      duration: 6,
      benefits: [
        '10% discount on medicines',
        'Free delivery on all orders',
        'Priority customer support',
        '1 free health checkup (basic)',
        '5% discount on lab tests',
      ],
    },
  });

  const memberPlatinum = await prisma.membershipPlan.create({
    data: {
      name: 'Platinum',
      price: 4999,
      duration: 12,
      benefits: [
        '15% discount on medicines',
        'Free delivery on all orders',
        'Priority customer support',
        '2 free health checkups (comprehensive)',
        '10% discount on lab tests',
        '10% discount on doctor consultations',
        'Exclusive member events',
      ],
    },
  });

  const memberDiamond = await prisma.membershipPlan.create({
    data: {
      name: 'Diamond',
      price: 9999,
      duration: 12,
      benefits: [
        '20% discount on medicines',
        'Free express delivery on all orders',
        'Dedicated relationship manager',
        '4 free health checkups (comprehensive)',
        '15% discount on lab tests',
        '15% discount on doctor consultations',
        'Free telemedicine consultations (unlimited)',
        'Exclusive member events',
        'Airport lounge access (2 per year)',
        'International second opinion (1 per year)',
      ],
    },
  });

  // ════════════════════════════════════════════════════════
  // 11. ORDERS (10) with items, status history, payments
  // ════════════════════════════════════════════════════════
  console.log('Creating orders...');

  // Helper to build order data
  const allMedicines = [
    medParacetamol, medAmoxicillin, medVitaminD3, medOmeprazole,
    medIbuprofen, medAzithromycin, medMultivitamin, medCetirizine,
    medPantoprazole, medDiclofenac,
  ];

  // --- Order 1: CONFIRMED, patient1, 2 items ---
  const order1 = await prisma.order.create({
    data: {
      orderNo: 'ORD100001',
      patientId: patient1.id,
      subtotal: 155,
      discount: 0,
      deliveryFee: 40,
      total: 195,
      status: 'CONFIRMED',
      deliveryAddress: '12, Nehru Nagar, Ahmedabad, Gujarat 380015',
      expectedDelivery: daysFromNow(5),
      items: {
        create: [
          { medicineId: medParacetamol.id, quantity: 2, price: 35, total: 70 },
          { medicineId: medOmeprazole.id, quantity: 1, price: 85, total: 85 },
        ],
      },
      statusHistory: {
        create: [
          { status: 'CONFIRMED', changedBy: 'System', note: 'Order placed successfully', createdAt: daysAgo(1) },
        ],
      },
    },
  });

  // --- Order 2: CONFIRMED, patient2, 1 item ---
  const order2 = await prisma.order.create({
    data: {
      orderNo: 'ORD100002',
      patientId: patient2.id,
      subtotal: 250,
      discount: 25,
      deliveryFee: 0,
      total: 225,
      status: 'CONFIRMED',
      deliveryAddress: '45, MG Road, Mumbai, Maharashtra 400001',
      expectedDelivery: daysFromNow(4),
      items: {
        create: [
          { medicineId: medVitaminD3.id, quantity: 1, price: 250, total: 250 },
        ],
      },
      statusHistory: {
        create: [
          { status: 'CONFIRMED', changedBy: 'System', note: 'Order confirmed', createdAt: daysAgo(0) },
        ],
      },
    },
  });

  // --- Order 3: CONFIRMED, patient6, 3 items ---
  const order3 = await prisma.order.create({
    data: {
      orderNo: 'ORD100003',
      patientId: patient6.id,
      subtotal: 425,
      discount: 42.50,
      deliveryFee: 0,
      total: 382.50,
      status: 'CONFIRMED',
      deliveryAddress: '90, Baner Road, Pune, Maharashtra 411045',
      expectedDelivery: daysFromNow(6),
      items: {
        create: [
          { medicineId: medMultivitamin.id, quantity: 1, price: 350, total: 350 },
          { medicineId: medCetirizine.id, quantity: 1, price: 30, total: 30 },
          { medicineId: medIbuprofen.id, quantity: 1, price: 45, total: 45 },
        ],
      },
      statusHistory: {
        create: [
          { status: 'CONFIRMED', changedBy: 'System', note: 'Order placed', createdAt: daysAgo(0) },
        ],
      },
    },
  });

  // --- Order 4: PROCESSING, patient3, 2 items ---
  const order4 = await prisma.order.create({
    data: {
      orderNo: 'ORD100004',
      patientId: patient3.id,
      subtotal: 260,
      discount: 0,
      deliveryFee: 40,
      total: 300,
      status: 'PROCESSING',
      deliveryAddress: '78, Sardar Patel Road, Surat, Gujarat 395007',
      expectedDelivery: daysFromNow(3),
      items: {
        create: [
          { medicineId: medAmoxicillin.id, quantity: 1, price: 120, total: 120 },
          { medicineId: medDiclofenac.id, quantity: 1, price: 140, total: 140 },
        ],
      },
      statusHistory: {
        create: [
          { status: 'CONFIRMED', changedBy: 'System', note: 'Order confirmed', createdAt: daysAgo(3) },
          { status: 'PROCESSING', changedBy: staffUser.name, note: 'Order is being processed', createdAt: daysAgo(2) },
        ],
      },
    },
  });

  // --- Order 5: PROCESSING, patient4, 1 item ---
  const order5 = await prisma.order.create({
    data: {
      orderNo: 'ORD100005',
      patientId: patient4.id,
      subtotal: 350,
      discount: 52.50,
      deliveryFee: 0,
      total: 297.50,
      status: 'PROCESSING',
      deliveryAddress: '23, Anna Salai, Chennai, Tamil Nadu 600002',
      expectedDelivery: daysFromNow(4),
      items: {
        create: [
          { medicineId: medMultivitamin.id, quantity: 1, price: 350, total: 350 },
        ],
      },
      statusHistory: {
        create: [
          { status: 'CONFIRMED', changedBy: 'System', note: 'Order confirmed', createdAt: daysAgo(4) },
          { status: 'PROCESSING', changedBy: staffUser.name, note: 'Packaging started', createdAt: daysAgo(2) },
        ],
      },
    },
  });

  // --- Order 6: PROCESSING, patient8, 2 items ---
  const order6 = await prisma.order.create({
    data: {
      orderNo: 'ORD100006',
      patientId: patient8.id,
      subtotal: 185,
      discount: 0,
      deliveryFee: 40,
      total: 225,
      status: 'PROCESSING',
      deliveryAddress: '34, Koramangala, Bangalore, Karnataka 560034',
      expectedDelivery: daysFromNow(2),
      items: {
        create: [
          { medicineId: medParacetamol.id, quantity: 1, price: 35, total: 35 },
          { medicineId: medAmoxicillin.id, quantity: 1, price: 120, total: 120 },
          { medicineId: medCetirizine.id, quantity: 1, price: 30, total: 30 /* extra item but only 10 calc, used 30 */ },
        ],
      },
      statusHistory: {
        create: [
          { status: 'CONFIRMED', changedBy: 'System', note: 'Order placed', createdAt: daysAgo(5) },
          { status: 'PROCESSING', changedBy: staffUser.name, note: 'Prescription verified, processing', createdAt: daysAgo(3) },
        ],
      },
    },
  });

  // --- Order 7: SHIPPED, patient5, 2 items ---
  const order7 = await prisma.order.create({
    data: {
      orderNo: 'ORD100007',
      patientId: patient5.id,
      subtotal: 345,
      discount: 0,
      deliveryFee: 40,
      total: 385,
      status: 'SHIPPED',
      deliveryAddress: '56, Lal Darwaja, Ahmedabad, Gujarat 380001',
      deliveryPartner: 'Delhivery',
      trackingNumber: 'DLV20260920001',
      expectedDelivery: daysFromNow(1),
      items: {
        create: [
          { medicineId: medAzithromycin.id, quantity: 1, price: 95, total: 95 },
          { medicineId: medVitaminD3.id, quantity: 1, price: 250, total: 250 },
        ],
      },
      statusHistory: {
        create: [
          { status: 'CONFIRMED', changedBy: 'System', note: 'Order confirmed', createdAt: daysAgo(7) },
          { status: 'PROCESSING', changedBy: staffUser.name, note: 'Processing', createdAt: daysAgo(5) },
          { status: 'SHIPPED', changedBy: staffUser.name, note: 'Shipped via Delhivery', createdAt: daysAgo(2) },
        ],
      },
    },
  });

  // --- Order 8: SHIPPED, patient7, 1 item ---
  const order8 = await prisma.order.create({
    data: {
      orderNo: 'ORD100008',
      patientId: patient7.id,
      subtotal: 140,
      discount: 14,
      deliveryFee: 40,
      total: 166,
      status: 'SHIPPED',
      deliveryAddress: '15, Civil Lines, Vadodara, Gujarat 390001',
      deliveryPartner: 'BlueDart',
      trackingNumber: 'BLU20260921002',
      expectedDelivery: daysFromNow(2),
      items: {
        create: [
          { medicineId: medDiclofenac.id, quantity: 1, price: 140, total: 140 },
        ],
      },
      statusHistory: {
        create: [
          { status: 'CONFIRMED', changedBy: 'System', note: 'Order placed', createdAt: daysAgo(6) },
          { status: 'PROCESSING', changedBy: staffUser.name, note: 'Packed', createdAt: daysAgo(4) },
          { status: 'SHIPPED', changedBy: staffUser.name, note: 'Shipped via BlueDart', createdAt: daysAgo(1) },
        ],
      },
    },
  });

  // --- Order 9: DELIVERED, patient2, 2 items ---
  const order9 = await prisma.order.create({
    data: {
      orderNo: 'ORD100009',
      patientId: patient2.id,
      subtotal: 130,
      discount: 0,
      deliveryFee: 0,
      total: 130,
      status: 'DELIVERED',
      deliveryAddress: '45, MG Road, Mumbai, Maharashtra 400001',
      deliveryPartner: 'Delhivery',
      trackingNumber: 'DLV20260905003',
      items: {
        create: [
          { medicineId: medOmeprazole.id, quantity: 1, price: 85, total: 85 },
          { medicineId: medIbuprofen.id, quantity: 1, price: 45, total: 45 },
        ],
      },
      statusHistory: {
        create: [
          { status: 'CONFIRMED', changedBy: 'System', note: 'Order confirmed', createdAt: daysAgo(20) },
          { status: 'PROCESSING', changedBy: staffUser.name, note: 'Processing', createdAt: daysAgo(18) },
          { status: 'SHIPPED', changedBy: staffUser.name, note: 'Shipped', createdAt: daysAgo(16) },
          { status: 'DELIVERED', changedBy: 'System', note: 'Delivered successfully', createdAt: daysAgo(14) },
        ],
      },
    },
  });

  // --- Order 10: DELIVERED, patient4, 3 items ---
  const order10 = await prisma.order.create({
    data: {
      orderNo: 'ORD100010',
      patientId: patient4.id,
      subtotal: 415,
      discount: 0,
      deliveryFee: 0,
      total: 415,
      status: 'DELIVERED',
      deliveryAddress: '23, Anna Salai, Chennai, Tamil Nadu 600002',
      deliveryPartner: 'BlueDart',
      trackingNumber: 'BLU20260830004',
      items: {
        create: [
          { medicineId: medParacetamol.id, quantity: 3, price: 35, total: 105 },
          { medicineId: medCetirizine.id, quantity: 2, price: 30, total: 60 },
          { medicineId: medVitaminD3.id, quantity: 1, price: 250, total: 250 },
        ],
      },
      statusHistory: {
        create: [
          { status: 'CONFIRMED', changedBy: 'System', note: 'Order confirmed', createdAt: daysAgo(30) },
          { status: 'PROCESSING', changedBy: staffUser.name, note: 'Processing', createdAt: daysAgo(28) },
          { status: 'SHIPPED', changedBy: staffUser.name, note: 'Shipped', createdAt: daysAgo(26) },
          { status: 'DELIVERED', changedBy: 'System', note: 'Delivered', createdAt: daysAgo(24) },
        ],
      },
    },
  });

  const orders = [order1, order2, order3, order4, order5, order6, order7, order8, order9, order10];

  // ════════════════════════════════════════════════════════
  // 12. APPOINTMENTS (8)
  // ════════════════════════════════════════════════════════
  console.log('Creating appointments...');

  // 2 REQUESTED (upcoming)
  const apt1 = await prisma.appointment.create({
    data: {
      appointmentNo: 'APT100001',
      patientId: patient1.id,
      doctorId: drArun.id,
      date: daysFromNow(5),
      time: '10:00',
      consultationType: 'IN_PERSON',
      reason: 'Routine cardiac checkup and ECG',
      status: 'REQUESTED',
    },
  });

  const apt2 = await prisma.appointment.create({
    data: {
      appointmentNo: 'APT100002',
      patientId: patient10.id,
      doctorId: drMeera.id,
      date: daysFromNow(7),
      time: '11:30',
      consultationType: 'IN_PERSON',
      reason: 'Skin rash and allergy consultation',
      status: 'REQUESTED',
    },
  });

  // 3 CONFIRMED (upcoming)
  const apt3 = await prisma.appointment.create({
    data: {
      appointmentNo: 'APT100003',
      patientId: patient3.id,
      doctorId: drRajesh.id,
      date: daysFromNow(3),
      time: '09:30',
      consultationType: 'IN_PERSON',
      reason: 'Knee pain follow-up and X-ray review',
      status: 'CONFIRMED',
    },
  });

  const apt4 = await prisma.appointment.create({
    data: {
      appointmentNo: 'APT100004',
      patientId: patient6.id,
      doctorId: drVikram.id,
      date: daysFromNow(2),
      time: '08:30',
      consultationType: 'IN_PERSON',
      reason: 'Persistent cough and cold for 10 days',
      status: 'CONFIRMED',
    },
  });

  const apt5 = await prisma.appointment.create({
    data: {
      appointmentNo: 'APT100005',
      patientId: patient8.id,
      doctorId: drAnjali.id,
      date: daysFromNow(4),
      time: '14:00',
      consultationType: 'VIDEO',
      reason: 'Child vaccination schedule consultation',
      status: 'CONFIRMED',
    },
  });

  // 2 COMPLETED (past)
  const apt6 = await prisma.appointment.create({
    data: {
      appointmentNo: 'APT100006',
      patientId: patient2.id,
      doctorId: drVikram.id,
      date: daysAgo(10),
      time: '09:00',
      consultationType: 'IN_PERSON',
      reason: 'Fever and body ache',
      notes: 'Diagnosed with viral fever. Prescribed Paracetamol and rest for 5 days. Follow-up if symptoms persist.',
      status: 'COMPLETED',
    },
  });

  const apt7 = await prisma.appointment.create({
    data: {
      appointmentNo: 'APT100007',
      patientId: patient4.id,
      doctorId: drMeera.id,
      date: daysAgo(15),
      time: '11:00',
      consultationType: 'IN_PERSON',
      reason: 'Acne treatment consultation',
      notes: 'Prescribed topical retinoid cream and oral antibiotics. Follow-up after 4 weeks.',
      status: 'COMPLETED',
    },
  });

  // 1 CANCELLED
  const apt8 = await prisma.appointment.create({
    data: {
      appointmentNo: 'APT100008',
      patientId: patient5.id,
      doctorId: drArun.id,
      date: daysAgo(5),
      time: '16:00',
      consultationType: 'IN_PERSON',
      reason: 'Chest pain evaluation',
      status: 'CANCELLED',
      cancelReason: 'Patient rescheduled due to personal emergency',
    },
  });

  const appointments = [apt1, apt2, apt3, apt4, apt5, apt6, apt7, apt8];

  // ════════════════════════════════════════════════════════
  // 13. INSURANCE APPLICATIONS (4)
  // ════════════════════════════════════════════════════════
  console.log('Creating insurance applications...');

  const insApp1 = await prisma.insuranceApplication.create({
    data: {
      applicationNo: 'INS100001',
      patientId: patient1.id,
      planId: insurPlanHealth.id,
      status: 'SUBMITTED',
    },
  });

  const insApp2 = await prisma.insuranceApplication.create({
    data: {
      applicationNo: 'INS100002',
      patientId: patient2.id,
      planId: insurPlanCritical.id,
      status: 'UNDER_REVIEW',
      reviewedBy: adminUser.name,
    },
  });

  const insApp3 = await prisma.insuranceApplication.create({
    data: {
      applicationNo: 'INS100003',
      patientId: patient3.id,
      planId: insurPlanCover.id,
      policyNumber: 'DJH-COV-2026-00345',
      startDate: daysAgo(30),
      endDate: daysFromNow(335),
      status: 'APPROVED',
      reviewedBy: adminUser.name,
      approvedBy: superAdmin.name,
    },
  });

  const insApp4 = await prisma.insuranceApplication.create({
    data: {
      applicationNo: 'INS100004',
      patientId: patient4.id,
      planId: insurPlanHealth.id,
      policyNumber: 'DJH-HLT-2026-00201',
      startDate: daysAgo(60),
      endDate: daysFromNow(305),
      status: 'ACTIVE',
      reviewedBy: adminUser.name,
      approvedBy: superAdmin.name,
    },
  });

  // ════════════════════════════════════════════════════════
  // 14. MEMBERSHIPS (3)
  // ════════════════════════════════════════════════════════
  console.log('Creating memberships...');

  const membership1 = await prisma.membership.create({
    data: {
      patientId: patient2.id,
      planId: memberGold.id,
      startDate: daysAgo(30),
      endDate: daysFromNow(150),
      status: 'ACTIVE',
    },
  });

  const membership2 = await prisma.membership.create({
    data: {
      patientId: patient4.id,
      planId: memberPlatinum.id,
      startDate: daysAgo(2),
      endDate: daysFromNow(363),
      status: 'PENDING',
    },
  });

  const membership3 = await prisma.membership.create({
    data: {
      patientId: patient7.id,
      planId: memberSilver.id,
      startDate: daysAgo(120),
      endDate: daysAgo(30),
      status: 'EXPIRED',
    },
  });

  // ════════════════════════════════════════════════════════
  // 15. TELEMEDICINE CONSULTATIONS (3)
  // ════════════════════════════════════════════════════════
  console.log('Creating telemedicine consultations...');

  const telemed1 = await prisma.telemedicineConsultation.create({
    data: {
      consultationNo: 'TLM100001',
      patientId: patient8.id,
      doctorId: drVikram.id,
      scheduledDate: daysFromNow(3),
      scheduledTime: '10:00',
      duration: 30,
      meetingLink: 'https://meet.divyajivan.com/tlm-100001',
      status: 'SCHEDULED',
    },
  });

  const telemed2 = await prisma.telemedicineConsultation.create({
    data: {
      consultationNo: 'TLM100002',
      patientId: patient2.id,
      doctorId: drAnjali.id,
      scheduledDate: daysAgo(7),
      scheduledTime: '15:00',
      duration: 20,
      meetingLink: 'https://meet.divyajivan.com/tlm-100002',
      notes: 'Follow-up consultation for child vaccination schedule. Discussed next round of vaccinations due.',
      status: 'COMPLETED',
    },
  });

  const telemed3 = await prisma.telemedicineConsultation.create({
    data: {
      consultationNo: 'TLM100003',
      patientId: patient6.id,
      doctorId: drMeera.id,
      scheduledDate: daysAgo(3),
      scheduledTime: '12:00',
      duration: 15,
      meetingLink: 'https://meet.divyajivan.com/tlm-100003',
      status: 'CANCELLED',
    },
  });

  // ════════════════════════════════════════════════════════
  // 16. MEDICAL TOURISM
  // ════════════════════════════════════════════════════════
  console.log('Creating medical tourism data...');

  // 2 Hospitals
  const mtHospital1 = await prisma.medicalTourismHospital.create({
    data: {
      name: 'Divyajivan International Hospital',
      city: 'Ahmedabad',
      country: 'India',
      address: 'SG Highway, Bodakdev, Ahmedabad, Gujarat 380054',
      description: 'Multi-speciality hospital with 500+ beds, NABH and JCI accredited, offering world-class treatment at affordable prices.',
      accreditation: 'NABH, JCI',
    },
  });

  const mtHospital2 = await prisma.medicalTourismHospital.create({
    data: {
      name: 'Shree Cardiac & Multi-Speciality Hospital',
      city: 'Mumbai',
      country: 'India',
      address: 'Andheri East, Mumbai, Maharashtra 400069',
      description: 'Premier cardiac care centre with advanced catheterisation lab and robotic surgery facility.',
      accreditation: 'NABH',
    },
  });

  // 3 Treatments
  await prisma.medicalTourismTreatment.createMany({
    data: [
      {
        name: 'Knee Replacement Surgery',
        category: 'Orthopedics',
        description: 'Total or partial knee replacement with imported prosthetics and post-operative rehabilitation.',
        hospitalId: mtHospital1.id,
        estimatedCost: 350000,
      },
      {
        name: 'Cardiac Bypass Surgery (CABG)',
        category: 'Cardiology',
        description: 'Coronary artery bypass grafting with state-of-the-art cardiac ICU and dedicated recovery ward.',
        hospitalId: mtHospital2.id,
        estimatedCost: 500000,
      },
      {
        name: 'Dental Implants',
        category: 'Dental',
        description: 'Full-mouth dental implants with Swiss-made titanium implants and ceramic crowns.',
        hospitalId: mtHospital1.id,
        estimatedCost: 80000,
      },
    ],
  });

  // 2 Packages
  await prisma.medicalTourismPackage.createMany({
    data: [
      {
        name: 'Joint Replacement Package',
        hospitalId: mtHospital1.id,
        description: 'All-inclusive package for knee or hip replacement surgery with 7-day hospital stay.',
        price: 400000,
        duration: '10 days',
        inclusions: [
          'Surgery and anaesthesia',
          '7-day hospital stay (private room)',
          'Pre-operative tests and consultation',
          'Post-operative physiotherapy (10 sessions)',
          'Airport pickup and drop',
          'Interpreter services',
          'Follow-up consultation (3 months)',
        ],
      },
      {
        name: 'Cardiac Care Package',
        hospitalId: mtHospital2.id,
        description: 'Comprehensive cardiac surgery package with extended ICU care and rehabilitation.',
        price: 600000,
        duration: '14 days',
        inclusions: [
          'Surgery and anaesthesia',
          '5-day ICU stay and 7-day ward stay',
          'Pre-operative cardiac evaluation',
          'Post-operative cardiac rehabilitation',
          'Airport transfers',
          'Accommodation for 1 attendant',
          'Interpreter services',
          'Follow-up consultation (6 months)',
        ],
      },
    ],
  });

  // 3 Enquiries
  await prisma.medicalTourismEnquiry.createMany({
    data: [
      {
        enquiryNo: 'MTR100001',
        patientId: patient3.id,
        hospitalId: mtHospital1.id,
        treatmentInterest: 'Knee Replacement Surgery',
        message: 'I have been suffering from severe knee pain for the past 2 years. My local doctor has recommended knee replacement. I would like to know more about the procedure and costs.',
        status: 'NEW',
      },
      {
        enquiryNo: 'MTR100002',
        patientId: patient9.id,
        hospitalId: mtHospital2.id,
        treatmentInterest: 'Cardiac Bypass Surgery',
        message: 'I need a triple bypass surgery as recommended by my cardiologist. Please share package details and available dates.',
        status: 'CONTACTED',
        assignedTo: adminUser.name,
        notes: 'Contacted patient on phone. Shared package details. Patient will confirm after discussing with family.',
      },
      {
        enquiryNo: 'MTR100003',
        patientId: patient1.id,
        hospitalId: mtHospital1.id,
        treatmentInterest: 'Dental Implants',
        message: 'Interested in full-mouth dental implant procedure. Need pricing and duration details.',
        status: 'UNDER_DISCUSSION',
        assignedTo: staffUser.name,
        notes: 'Patient has shared dental X-rays. Treatment plan being prepared by dental team.',
      },
    ],
  });

  // ════════════════════════════════════════════════════════
  // 17. POINTS RULES (3)
  // ════════════════════════════════════════════════════════
  console.log('Creating points rules...');

  await prisma.pointsRule.createMany({
    data: [
      {
        name: 'Medicine Purchase',
        type: 'MEDICINE_PURCHASE',
        pointsValue: 10,
        description: 'Earn 10 points for every Rs 100 spent on medicines',
        isActive: true,
      },
      {
        name: 'Membership Purchase',
        type: 'MEMBERSHIP_PURCHASE',
        pointsValue: 500,
        description: 'Earn 500 bonus points on purchasing any membership plan',
        isActive: true,
      },
      {
        name: 'Referral Bonus',
        type: 'REFERRAL',
        pointsValue: 200,
        description: 'Earn 200 points when a referred friend makes their first purchase',
        isActive: true,
      },
    ],
  });

  // ════════════════════════════════════════════════════════
  // 18. POINTS TRANSACTIONS (5)
  // ════════════════════════════════════════════════════════
  console.log('Creating points transactions...');

  await prisma.pointsTransaction.createMany({
    data: [
      {
        patientId: patient1.id,
        points: 200,
        type: 'REFERRAL',
        reference: patient6.id,
        description: 'Referral bonus - Kavita Joshi joined via referral',
        createdAt: daysAgo(45),
      },
      {
        patientId: patient1.id,
        points: 250,
        type: 'MEDICINE_PURCHASE',
        reference: order1.id,
        description: 'Points earned on medicine purchase',
        createdAt: daysAgo(1),
      },
      {
        patientId: patient2.id,
        points: 500,
        type: 'MEMBERSHIP_PURCHASE',
        reference: membership1.id,
        description: 'Bonus points for Gold membership purchase',
        createdAt: daysAgo(30),
      },
      {
        patientId: patient2.id,
        points: 130,
        type: 'MEDICINE_PURCHASE',
        reference: order9.id,
        description: 'Points earned on medicine purchase',
        createdAt: daysAgo(14),
      },
      {
        patientId: patient4.id,
        points: 415,
        type: 'MEDICINE_PURCHASE',
        reference: order10.id,
        description: 'Points earned on medicine purchase',
        createdAt: daysAgo(24),
      },
    ],
  });

  // ════════════════════════════════════════════════════════
  // 19. PAYMENTS
  // ════════════════════════════════════════════════════════
  console.log('Creating payments...');

  // Order payments
  const orderPaymentData = [
    { order: order1, amount: 195, status: 'SUCCESSFUL' as const, method: 'UPI', providerRef: 'UPI20260925001', createdAt: daysAgo(1) },
    { order: order2, amount: 225, status: 'SUCCESSFUL' as const, method: 'UPI', providerRef: 'UPI20260926002', createdAt: daysAgo(0) },
    { order: order3, amount: 382.50, status: 'SUCCESSFUL' as const, method: 'Credit Card', providerRef: 'CC20260926003', createdAt: daysAgo(0) },
    { order: order4, amount: 300, status: 'SUCCESSFUL' as const, method: 'UPI', providerRef: 'UPI20260923004', createdAt: daysAgo(3) },
    { order: order5, amount: 297.50, status: 'SUCCESSFUL' as const, method: 'Net Banking', providerRef: 'NB20260922005', createdAt: daysAgo(4) },
    { order: order6, amount: 225, status: 'SUCCESSFUL' as const, method: 'UPI', providerRef: 'UPI20260921006', createdAt: daysAgo(5) },
    { order: order7, amount: 385, status: 'SUCCESSFUL' as const, method: 'Debit Card', providerRef: 'DC20260919007', createdAt: daysAgo(7) },
    { order: order8, amount: 166, status: 'SUCCESSFUL' as const, method: 'UPI', providerRef: 'UPI20260920008', createdAt: daysAgo(6) },
    { order: order9, amount: 130, status: 'SUCCESSFUL' as const, method: 'UPI', providerRef: 'UPI20260906009', createdAt: daysAgo(20) },
    { order: order10, amount: 415, status: 'SUCCESSFUL' as const, method: 'Credit Card', providerRef: 'CC20260827010', createdAt: daysAgo(30) },
  ];

  let txnCounter = 1;
  for (const op of orderPaymentData) {
    await prisma.payment.create({
      data: {
        transactionNo: `TXN${String(100000 + txnCounter++).padStart(6, '0')}`,
        patientId: op.order.patientId,
        type: 'MEDICINE',
        amount: op.amount,
        method: op.method,
        providerRef: op.providerRef,
        status: op.status,
        orderId: op.order.id,
        createdAt: op.createdAt,
      },
    });
  }

  // Appointment payments (for CONFIRMED and COMPLETED appointments)
  const appointmentPayments = [
    { apt: apt3, amount: 1000, method: 'UPI', providerRef: 'UPI20260923APT03' },
    { apt: apt4, amount: 400, method: 'UPI', providerRef: 'UPI20260924APT04' },
    { apt: apt5, amount: 500, method: 'Credit Card', providerRef: 'CC20260922APT05' },
    { apt: apt6, amount: 400, method: 'UPI', providerRef: 'UPI20260916APT06' },
    { apt: apt7, amount: 600, method: 'Debit Card', providerRef: 'DC20260911APT07' },
  ];

  for (const ap of appointmentPayments) {
    await prisma.payment.create({
      data: {
        transactionNo: `TXN${String(100000 + txnCounter++).padStart(6, '0')}`,
        patientId: ap.apt.patientId,
        type: 'APPOINTMENT',
        amount: ap.amount,
        method: ap.method,
        providerRef: ap.providerRef,
        status: 'SUCCESSFUL',
        appointmentId: ap.apt.id,
      },
    });
  }

  // Membership payment (for active membership)
  await prisma.payment.create({
    data: {
      transactionNo: `TXN${String(100000 + txnCounter++).padStart(6, '0')}`,
      patientId: patient2.id,
      type: 'MEMBERSHIP',
      amount: 2499,
      method: 'UPI',
      providerRef: 'UPI20260827MBR01',
      status: 'SUCCESSFUL',
      membershipId: membership1.id,
    },
  });

  // Telemedicine payments
  await prisma.payment.create({
    data: {
      transactionNo: `TXN${String(100000 + txnCounter++).padStart(6, '0')}`,
      patientId: patient8.id,
      type: 'APPOINTMENT',
      amount: 400,
      method: 'UPI',
      providerRef: 'UPI20260923TLM01',
      status: 'SUCCESSFUL',
      telemedicineId: telemed1.id,
    },
  });

  await prisma.payment.create({
    data: {
      transactionNo: `TXN${String(100000 + txnCounter++).padStart(6, '0')}`,
      patientId: patient2.id,
      type: 'APPOINTMENT',
      amount: 500,
      method: 'UPI',
      providerRef: 'UPI20260919TLM02',
      status: 'SUCCESSFUL',
      telemedicineId: telemed2.id,
    },
  });

  // ════════════════════════════════════════════════════════
  // 20. ADMIN ACTIVITY LOGS (10)
  // ════════════════════════════════════════════════════════
  console.log('Creating admin activity logs...');

  await prisma.adminActivityLog.createMany({
    data: [
      {
        adminId: superAdmin.id,
        adminName: superAdmin.name,
        action: 'CREATE',
        module: 'DOCTORS',
        recordId: drArun.id,
        newValue: 'Dr. Arun Sharma - Cardiologist',
        ipAddress: '192.168.1.10',
        createdAt: daysAgo(60),
      },
      {
        adminId: superAdmin.id,
        adminName: superAdmin.name,
        action: 'CREATE',
        module: 'DOCTORS',
        recordId: drMeera.id,
        newValue: 'Dr. Meera Patel - Dermatologist',
        ipAddress: '192.168.1.10',
        createdAt: daysAgo(59),
      },
      {
        adminId: adminUser.id,
        adminName: adminUser.name,
        action: 'UPDATE',
        module: 'MEDICINES',
        recordId: medParacetamol.id,
        oldValue: 'Price: 30.00',
        newValue: 'Price: 35.00',
        ipAddress: '192.168.1.15',
        createdAt: daysAgo(45),
      },
      {
        adminId: staffUser.id,
        adminName: staffUser.name,
        action: 'UPDATE',
        module: 'ORDERS',
        recordId: order4.id,
        oldValue: 'Status: CONFIRMED',
        newValue: 'Status: PROCESSING',
        ipAddress: '192.168.1.20',
        createdAt: daysAgo(2),
      },
      {
        adminId: staffUser.id,
        adminName: staffUser.name,
        action: 'UPDATE',
        module: 'ORDERS',
        recordId: order7.id,
        oldValue: 'Status: PROCESSING',
        newValue: 'Status: SHIPPED',
        ipAddress: '192.168.1.20',
        createdAt: daysAgo(2),
      },
      {
        adminId: adminUser.id,
        adminName: adminUser.name,
        action: 'UPDATE',
        module: 'INSURANCE',
        recordId: insApp3.id,
        oldValue: 'Status: SUBMITTED',
        newValue: 'Status: APPROVED',
        ipAddress: '192.168.1.15',
        createdAt: daysAgo(30),
      },
      {
        adminId: superAdmin.id,
        adminName: superAdmin.name,
        action: 'CREATE',
        module: 'MEMBERSHIP_PLANS',
        recordId: memberDiamond.id,
        newValue: 'Diamond - Rs 9999/12 months',
        ipAddress: '192.168.1.10',
        createdAt: daysAgo(90),
      },
      {
        adminId: staffUser.id,
        adminName: staffUser.name,
        action: 'UPDATE',
        module: 'MEDICINES',
        recordId: medPantoprazole.id,
        oldValue: 'Stock: 20',
        newValue: 'Stock: 0',
        ipAddress: '192.168.1.20',
        createdAt: daysAgo(5),
      },
      {
        adminId: adminUser.id,
        adminName: adminUser.name,
        action: 'CREATE',
        module: 'LAB_TESTS',
        recordId: testVitaminD.id,
        newValue: 'Vitamin D Test (25-OH) - Rs 800',
        ipAddress: '192.168.1.15',
        createdAt: daysAgo(40),
      },
      {
        adminId: superAdmin.id,
        adminName: superAdmin.name,
        action: 'UPDATE',
        module: 'PATIENTS',
        recordId: patient5.id,
        oldValue: 'Status: INACTIVE',
        newValue: 'Status: ACTIVE',
        ipAddress: '192.168.1.10',
        createdAt: daysAgo(10),
      },
    ],
  });

  // ════════════════════════════════════════════════════════
  // 21. NOTIFICATIONS (5)
  // ════════════════════════════════════════════════════════
  console.log('Creating notifications...');

  await prisma.notification.createMany({
    data: [
      {
        patientId: patient1.id,
        type: 'ORDER_UPDATE',
        channel: 'PUSH',
        title: 'Order Confirmed',
        message: 'Your order ORD100001 has been confirmed and will be delivered within 5 days.',
        isRead: false,
        createdAt: daysAgo(1),
      },
      {
        patientId: patient2.id,
        type: 'MEMBERSHIP',
        channel: 'EMAIL',
        title: 'Gold Membership Activated',
        message: 'Congratulations! Your Gold membership is now active. Enjoy exclusive discounts and benefits.',
        isRead: true,
        createdAt: daysAgo(30),
      },
      {
        patientId: patient3.id,
        type: 'APPOINTMENT_REMINDER',
        channel: 'WHATSAPP',
        title: 'Appointment Reminder',
        message: 'Reminder: You have an appointment with Dr. Rajesh Kumar on ' + daysFromNow(3).toLocaleDateString('en-IN') + ' at 09:30 AM.',
        isRead: false,
        createdAt: daysAgo(0),
      },
      {
        patientId: patient5.id,
        type: 'ORDER_UPDATE',
        channel: 'SMS',
        title: 'Order Shipped',
        message: 'Your order ORD100007 has been shipped via Delhivery. Tracking number: DLV20260920001.',
        isRead: true,
        createdAt: daysAgo(2),
      },
      {
        patientId: patient4.id,
        type: 'INSURANCE',
        channel: 'EMAIL',
        title: 'Insurance Policy Active',
        message: 'Your Health Plan insurance policy DJH-HLT-2026-00201 is now active. Coverage: Rs 5,00,000.',
        isRead: true,
        createdAt: daysAgo(60),
      },
    ],
  });

  // ════════════════════════════════════════════════════════
  // 22. COUPONS (2)
  // ════════════════════════════════════════════════════════
  console.log('Creating coupons...');

  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        discountPercent: 10,
        maxDiscount: 200,
        minOrder: 500,
        usageLimit: 1000,
        usedCount: 45,
        validFrom: daysAgo(60),
        validTo: daysFromNow(120),
        isActive: true,
      },
      {
        code: 'HEALTH20',
        discountPercent: 20,
        maxDiscount: 500,
        minOrder: 1000,
        usageLimit: 500,
        usedCount: 12,
        validFrom: daysAgo(30),
        validTo: daysFromNow(60),
        isActive: true,
      },
    ],
  });

  // ════════════════════════════════════════════════════════
  // DONE
  // ════════════════════════════════════════════════════════
  console.log('');
  console.log('Seeding complete!');
  console.log('─────────────────────────────────────────');
  console.log(`  Admins:             3`);
  console.log(`  Medicine Categories: 5`);
  console.log(`  Medicines:          10`);
  console.log(`  Doctors:            5`);
  console.log(`  Patients:           10`);
  console.log(`  Family Members:     5`);
  console.log(`  Labs:               2`);
  console.log(`  Lab Tests:          8`);
  console.log(`  Lab Packages:       2`);
  console.log(`  Insurance Plans:    3`);
  console.log(`  Membership Plans:   4`);
  console.log(`  Orders:             10`);
  console.log(`  Appointments:       8`);
  console.log(`  Insurance Apps:     4`);
  console.log(`  Memberships:        3`);
  console.log(`  Telemedicine:       3`);
  console.log(`  Med Tourism Hosps:  2`);
  console.log(`  Points Rules:       3`);
  console.log(`  Points Txns:        5`);
  console.log(`  Payments:           ${txnCounter - 1}`);
  console.log(`  Activity Logs:      10`);
  console.log(`  Notifications:      5`);
  console.log(`  Coupons:            2`);
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
