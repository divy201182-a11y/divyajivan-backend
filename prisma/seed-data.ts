import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Delete existing doctors & medicines to avoid duplicates ──
  await prisma.orderItem.deleteMany({});
  await prisma.medicine.deleteMany({});
  await prisma.medicineCategory.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.doctorAvailability.deleteMany({});
  await prisma.doctor.deleteMany({});

  console.log('Cleared existing doctors, medicines & categories.');

  // ── Medicine Categories ──
  const categories = [
    'Iron & Blood',
    'Vitamins & Supplements',
    'Anti-Infectives',
    'Gastric Care',
    'Heart & BP',
    'Cholesterol',
    'Diabetes Care',
    'Allergy & Respiratory',
  ];

  const categoryMap: Record<string, string> = {};
  for (const name of categories) {
    const cat = await prisma.medicineCategory.create({ data: { name } });
    categoryMap[name] = cat.id;
  }
  console.log(`Created ${categories.length} medicine categories.`);

  // ── 24 Medicines ──
  const medicines = [
    { name: 'Ferronovit-XT', category: 'Iron & Blood', price: 185, stock: 200, prescription: true, desc: 'Iron, folic acid & vitamin B12 supplement for anemia management' },
    { name: 'D3 Fusion', category: 'Vitamins & Supplements', price: 220, stock: 300, prescription: false, desc: 'High-potency vitamin D3 supplement for bone health' },
    { name: 'Falcidevo 60', category: 'Anti-Infectives', price: 95, stock: 150, prescription: true, desc: 'Cefixime 60mg dispersible tablet for pediatric infections' },
    { name: 'Falcidevo 120', category: 'Anti-Infectives', price: 145, stock: 150, prescription: true, desc: 'Cefixime 120mg dispersible tablet for infections' },
    { name: 'Nutrajivan-FD3', category: 'Vitamins & Supplements', price: 260, stock: 250, prescription: false, desc: 'Multivitamin with iron, folic acid & D3 for daily nutrition' },
    { name: 'Rabejivan DSR', category: 'Gastric Care', price: 175, stock: 180, prescription: true, desc: 'Rabeprazole & domperidone SR capsule for acid reflux & gastritis' },
    { name: 'Telmijivan 40', category: 'Heart & BP', price: 120, stock: 200, prescription: true, desc: 'Telmisartan 40mg for hypertension management' },
    { name: 'Telmijivan-H', category: 'Heart & BP', price: 155, stock: 180, prescription: true, desc: 'Telmisartan + hydrochlorothiazide for blood pressure control' },
    { name: 'Telmijivan-AM', category: 'Heart & BP', price: 165, stock: 160, prescription: true, desc: 'Telmisartan + amlodipine for hypertension' },
    { name: 'Telmijivan-Beta', category: 'Heart & BP', price: 180, stock: 140, prescription: true, desc: 'Telmisartan + metoprolol for BP & heart rate control' },
    { name: 'Telmijivan-AMH', category: 'Heart & BP', price: 195, stock: 120, prescription: true, desc: 'Telmisartan + amlodipine + HCTZ triple combination' },
    { name: 'Atorvajivan 40', category: 'Cholesterol', price: 130, stock: 200, prescription: true, desc: 'Atorvastatin 40mg for cholesterol management' },
    { name: 'Rosujivan 10', category: 'Cholesterol', price: 145, stock: 180, prescription: true, desc: 'Rosuvastatin 10mg for lowering LDL cholesterol' },
    { name: 'Rosujivan 20', category: 'Cholesterol', price: 210, stock: 160, prescription: true, desc: 'Rosuvastatin 20mg for advanced cholesterol control' },
    { name: 'Canditrazole', category: 'Anti-Infectives', price: 110, stock: 170, prescription: true, desc: 'Antifungal tablet for candidiasis & fungal infections' },
    { name: 'Metjivan 500 SR', category: 'Diabetes Care', price: 85, stock: 250, prescription: true, desc: 'Metformin 500mg sustained release for type 2 diabetes' },
    { name: 'Dapajivan 5', category: 'Diabetes Care', price: 195, stock: 200, prescription: true, desc: 'Dapagliflozin 5mg SGLT2 inhibitor for diabetes' },
    { name: 'Dapajivan 10', category: 'Diabetes Care', price: 240, stock: 180, prescription: true, desc: 'Dapagliflozin 10mg SGLT2 inhibitor for diabetes' },
    { name: 'Metjivan G1', category: 'Diabetes Care', price: 115, stock: 200, prescription: true, desc: 'Metformin + glimepiride 1mg for diabetes management' },
    { name: 'Metjivan G2', category: 'Diabetes Care', price: 135, stock: 180, prescription: true, desc: 'Metformin + glimepiride 2mg for diabetes management' },
    { name: 'Metjivan Dapa', category: 'Diabetes Care', price: 280, stock: 150, prescription: true, desc: 'Metformin + dapagliflozin combination for diabetes' },
    { name: 'Dapajivan SM', category: 'Diabetes Care', price: 310, stock: 130, prescription: true, desc: 'Dapagliflozin + saxagliptin + metformin triple therapy' },
    { name: 'Metjivan Sita', category: 'Diabetes Care', price: 250, stock: 160, prescription: true, desc: 'Metformin + sitagliptin combination for diabetes' },
    { name: 'Montdevo-L', category: 'Allergy & Respiratory', price: 155, stock: 220, prescription: true, desc: 'Montelukast + levocetirizine for allergies & asthma' },
  ];

  for (const m of medicines) {
    await prisma.medicine.create({
      data: {
        name: m.name,
        categoryId: categoryMap[m.category],
        brand: 'Divyajivan Health',
        description: m.desc,
        price: m.price,
        discountPercent: 0,
        stock: m.stock,
        prescriptionRequired: m.prescription,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`Created ${medicines.length} medicines.`);

  // ── 12 Doctors ──
  const doctors = [
    { name: 'Dr. Purshottambhai Koradia', specialization: 'General Medicine', experience: 25, qualification: 'MBBS, MD (Medicine)', fee: 500, phone: '9100000001', email: 'dr.koradia@divyajivan.com', bio: 'Senior general physician with 25 years of clinical experience in internal medicine and chronic disease management.' },
    { name: 'Dr. Kirit Sisodiya', specialization: 'General Medicine', experience: 22, qualification: 'MBBS, MD (Medicine)', fee: 450, phone: '9100000002', email: 'dr.sisodiya@divyajivan.com', bio: 'Experienced general medicine practitioner specializing in preventive healthcare and lifestyle diseases.' },
    { name: 'Dr. Krutika D Patel', specialization: 'Dermatology', experience: 10, qualification: 'MBBS, MD (Dermatology)', fee: 600, phone: '9100000003', email: 'dr.krutika@divyajivan.com', bio: 'Dermatologist with expertise in cosmetic dermatology, acne management and skin allergy treatments.' },
    { name: 'Dr. Mehul Patel', specialization: 'Dermatology', experience: 8, qualification: 'MBBS, DVD', fee: 550, phone: '9100000004', email: 'dr.mehul@divyajivan.com', bio: 'Skin specialist focusing on eczema, psoriasis and hair-related disorders.' },
    { name: 'Dr. Payal N Choksi', specialization: 'Dermatology', experience: 12, qualification: 'MBBS, MD (Dermatology), DNB', fee: 700, phone: '9100000005', email: 'dr.choksi@divyajivan.com', bio: 'Senior dermatologist with advanced training in laser procedures and pigmentation treatments.' },
    { name: 'Dr. Preeti Reshamwala', specialization: 'Dermatology', experience: 9, qualification: 'MBBS, MD (Dermatology)', fee: 550, phone: '9100000006', email: 'dr.preeti@divyajivan.com', bio: 'Dermatologist specializing in pediatric skin conditions and aesthetic procedures.' },
    { name: 'Dr. Priya Sharma', specialization: 'Pediatrics', experience: 18, qualification: 'MBBS, MD (Pediatrics)', fee: 500, phone: '9100000007', email: 'dr.priya@divyajivan.com', bio: 'Senior pediatrician with focus on neonatal care, childhood nutrition and developmental disorders.' },
    { name: 'Dr. Amit Desai', specialization: 'Cardiology', experience: 20, qualification: 'MBBS, MD (Medicine), DM (Cardiology)', fee: 900, phone: '9100000008', email: 'dr.amit@divyajivan.com', bio: 'Interventional cardiologist with 20 years of experience in cardiac catheterization and heart failure management.' },
    { name: 'Dr. Sneha Joshi', specialization: 'Obstetrics & Gynecology', experience: 14, qualification: 'MBBS, MS (OB-GYN)', fee: 650, phone: '9100000009', email: 'dr.sneha@divyajivan.com', bio: 'Obstetrician & gynecologist specializing in high-risk pregnancies and minimally invasive gynecological surgery.' },
    { name: 'Dr. Rakesh Modi', specialization: 'Orthopedics', experience: 16, qualification: 'MBBS, MS (Orthopedics)', fee: 700, phone: '9100000010', email: 'dr.rakesh@divyajivan.com', bio: 'Orthopedic surgeon specializing in joint replacements, sports injuries and spinal disorders.' },
    { name: 'Dr. Nayan Patel', specialization: 'ENT', experience: 11, qualification: 'MBBS, MS (ENT)', fee: 500, phone: '9100000011', email: 'dr.nayan@divyajivan.com', bio: 'ENT specialist with expertise in sinus surgery, hearing disorders and pediatric ENT conditions.' },
    { name: 'Dr. Anita Sharma', specialization: 'General Surgery', experience: 15, qualification: 'MBBS, MS (General Surgery)', fee: 750, phone: '9100000012', email: 'dr.anita@divyajivan.com', bio: 'General surgeon with expertise in laparoscopic procedures, hernia repair and gallbladder surgery.' },
  ];

  for (const d of doctors) {
    await prisma.doctor.create({
      data: {
        name: d.name,
        specialization: d.specialization,
        qualification: d.qualification,
        experience: d.experience,
        phone: d.phone,
        email: d.email,
        consultationFee: d.fee,
        hospital: 'Divyajivan Health Centre',
        bio: d.bio,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`Created ${doctors.length} doctors.`);

  console.log('\nSeed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
