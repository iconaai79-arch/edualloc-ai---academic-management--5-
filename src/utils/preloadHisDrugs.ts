import { apiService } from '../services/apiService';

export interface PreloadedDrug {
    id: string;
    name: string;
    genericName?: string;
    category: string;
    formulation: string;
    dosageForm: string;
    strength: string;
    unitPrice: number;
    costPrice: number;
    stockQuantity: number;
    reorderLevel: number;
    isNarcotic?: boolean;
    requiresPrescription?: boolean;
    description?: string;
}

export const PRELOADED_HIS_DRUGS: PreloadedDrug[] = [
    // ── Analgesics & Antipyretics ─────────────────────────────────────────────
    {
        id: 'drug_paracetamol_500',
        name: 'Paracetamol 500mg Tablets',
        genericName: 'Acetaminophen',
        category: 'Analgesics & Antipyretics',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '500mg',
        unitPrice: 10,
        costPrice: 4,
        stockQuantity: 1500,
        reorderLevel: 200,
        requiresPrescription: false,
        description: 'First-line analgesic and antipyretic for mild-to-moderate pain and fever reduction.'
    },
    {
        id: 'drug_paracetamol_syrup',
        name: 'Paracetamol 120mg/5ml Syrup (100ml)',
        genericName: 'Acetaminophen Suspension',
        category: 'Analgesics & Antipyretics',
        formulation: 'Syrup / Suspension',
        dosageForm: 'Pediatric Oral',
        strength: '120mg/5ml',
        unitPrice: 150,
        costPrice: 80,
        stockQuantity: 120,
        reorderLevel: 25,
        requiresPrescription: false,
        description: 'Pediatric fever and mild pain relief liquid formula.'
    },
    {
        id: 'drug_ibuprofen_400',
        name: 'Ibuprofen 400mg Tablets',
        genericName: 'Ibuprofen',
        category: 'Analgesics & NSAIDs',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '400mg',
        unitPrice: 15,
        costPrice: 6,
        stockQuantity: 800,
        reorderLevel: 150,
        requiresPrescription: false,
        description: 'NSAID for acute inflammatory pain, joint stiffness, dysmenorrhea, and toothaches.'
    },
    {
        id: 'drug_diclofenac_50',
        name: 'Diclofenac Sodium 50mg Tablets',
        genericName: 'Diclofenac',
        category: 'Analgesics & NSAIDs',
        formulation: 'Enteric Coated Tablet',
        dosageForm: 'Oral',
        strength: '50mg',
        unitPrice: 20,
        costPrice: 8,
        stockQuantity: 600,
        reorderLevel: 100,
        requiresPrescription: true,
        description: 'Potent anti-inflammatory analgesic for musculo-skeletal and post-operative pain.'
    },
    {
        id: 'drug_diclofenac_inj',
        name: 'Diclofenac 75mg/3ml Injection Ampoule',
        genericName: 'Diclofenac Sodium Inj',
        category: 'Analgesics & NSAIDs',
        formulation: 'Injectable Ampoule',
        dosageForm: 'IM / IV',
        strength: '75mg/3ml',
        unitPrice: 150,
        costPrice: 60,
        stockQuantity: 150,
        reorderLevel: 30,
        requiresPrescription: true,
        description: 'Rapid-acting parenteral analgesic for renal colic and acute severe trauma.'
    },
    {
        id: 'drug_tramadol_50',
        name: 'Tramadol 50mg Capsules',
        genericName: 'Tramadol Hydrochloride',
        category: 'Narcotics & Opioids',
        formulation: 'Capsule',
        dosageForm: 'Oral',
        strength: '50mg',
        unitPrice: 35,
        costPrice: 15,
        stockQuantity: 300,
        reorderLevel: 50,
        isNarcotic: true,
        requiresPrescription: true,
        description: 'Centrally-acting narcotic analgesic for moderate-to-severe surgical or visceral pain.'
    },

    // ── Antibiotics & Anti-infectives ──────────────────────────────────────────
    {
        id: 'drug_amoxicillin_500',
        name: 'Amoxicillin 500mg Capsules',
        genericName: 'Amoxicillin Trihydrate',
        category: 'Antibiotics',
        formulation: 'Capsule',
        dosageForm: 'Oral',
        strength: '500mg',
        unitPrice: 20,
        costPrice: 8,
        stockQuantity: 1200,
        reorderLevel: 200,
        requiresPrescription: true,
        description: 'Broad-spectrum aminopenicillin for respiratory, ENT, and urinary tract infections.'
    },
    {
        id: 'drug_augmentin_625',
        name: 'Amoxicillin/Clavulanate (Augmentin) 625mg',
        genericName: 'Amoxicillin + Potassium Clavulanate',
        category: 'Antibiotics',
        formulation: 'Film-Coated Tablet',
        dosageForm: 'Oral',
        strength: '500mg/125mg',
        unitPrice: 120,
        costPrice: 60,
        stockQuantity: 400,
        reorderLevel: 60,
        requiresPrescription: true,
        description: 'Beta-lactamase resistant penicillin combination for complicated infections.'
    },
    {
        id: 'drug_amox_susp',
        name: 'Amoxicillin 125mg/5ml Oral Powder for Suspension',
        genericName: 'Amoxicillin Oral Suspension',
        category: 'Antibiotics',
        formulation: 'Oral Powder Suspension',
        dosageForm: 'Pediatric Oral',
        strength: '125mg/5ml',
        unitPrice: 250,
        costPrice: 120,
        stockQuantity: 90,
        reorderLevel: 20,
        requiresPrescription: true,
        description: 'Pediatric antibiotic formulation for otitis media and tonsillitis.'
    },
    {
        id: 'drug_azithromycin_500',
        name: 'Azithromycin 500mg Tablets',
        genericName: 'Azithromycin Dihydrate',
        category: 'Antibiotics',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '500mg',
        unitPrice: 100,
        costPrice: 45,
        stockQuantity: 350,
        reorderLevel: 50,
        requiresPrescription: true,
        description: 'Macrolide antibiotic for atypical pneumonia, STIs, and skin infections.'
    },
    {
        id: 'drug_ciprofloxacin_500',
        name: 'Ciprofloxacin 500mg Tablets',
        genericName: 'Ciprofloxacin HCl',
        category: 'Antibiotics',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '500mg',
        unitPrice: 30,
        costPrice: 12,
        stockQuantity: 700,
        reorderLevel: 100,
        requiresPrescription: true,
        description: 'Fluoroquinolone for complex urinary tract, typhoid, and GI infections.'
    },
    {
        id: 'drug_ceftriaxone_1g',
        name: 'Ceftriaxone 1g Powder for Injection Vial',
        genericName: 'Ceftriaxone Sodium',
        category: 'Antibiotics',
        formulation: 'Injectable Powder Vial',
        dosageForm: 'IV / IM',
        strength: '1g',
        unitPrice: 350,
        costPrice: 160,
        stockQuantity: 200,
        reorderLevel: 40,
        requiresPrescription: true,
        description: '3rd generation cephalosporin for severe sepsis, meningitis, and inpatient infections.'
    },
    {
        id: 'drug_metronidazole_400',
        name: 'Metronidazole (Flagyl) 400mg Tablets',
        genericName: 'Metronidazole',
        category: 'Antibiotics & Antiprotozoals',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '400mg',
        unitPrice: 15,
        costPrice: 5,
        stockQuantity: 900,
        reorderLevel: 150,
        requiresPrescription: true,
        description: 'Nitroimidazole antimicrobial for anaerobic infections, amoebiasis, and giardiasis.'
    },
    {
        id: 'drug_doxycycline_100',
        name: 'Doxycycline 100mg Capsules',
        genericName: 'Doxycycline Hyclate',
        category: 'Antibiotics',
        formulation: 'Capsule',
        dosageForm: 'Oral',
        strength: '100mg',
        unitPrice: 15,
        costPrice: 6,
        stockQuantity: 500,
        reorderLevel: 80,
        requiresPrescription: true,
        description: 'Tetracycline for pelvic inflammatory disease, acne, rickettsia, and malaria prophylaxis.'
    },

    // ── Antimalarials ────────────────────────────────────────────────────────
    {
        id: 'drug_coartem_80_480',
        name: 'Artemether / Lumefantrine (Coartem) 80/480mg',
        genericName: 'Artemether + Lumefantrine',
        category: 'Antimalarials',
        formulation: 'Tablet Blister Pack',
        dosageForm: 'Oral',
        strength: '80mg/480mg',
        unitPrice: 350,
        costPrice: 180,
        stockQuantity: 250,
        reorderLevel: 50,
        requiresPrescription: true,
        description: 'First-line Artemisinin Combination Therapy (ACT) for uncomplicated Plasmodium falciparum malaria.'
    },
    {
        id: 'drug_artesunate_inj',
        name: 'Artesunate 60mg Injection Vial',
        genericName: 'Artesunate Powder for Inj',
        category: 'Antimalarials',
        formulation: 'Injectable Vial',
        dosageForm: 'IV / IM',
        strength: '60mg',
        unitPrice: 500,
        costPrice: 280,
        stockQuantity: 80,
        reorderLevel: 20,
        requiresPrescription: true,
        description: 'Emergency Parenteral Artemisinin derivative for severe cerebral malaria.'
    },

    // ── Antihypertensives & Cardiovascular ──────────────────────────────────
    {
        id: 'drug_amlodipine_5',
        name: 'Amlodipine Besylate 5mg Tablets',
        genericName: 'Amlodipine',
        category: 'Cardiovascular & Antihypertensives',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '5mg',
        unitPrice: 25,
        costPrice: 10,
        stockQuantity: 600,
        reorderLevel: 100,
        requiresPrescription: true,
        description: 'Dihydropyridine Calcium Channel Blocker for hypertension and angina pectoris.'
    },
    {
        id: 'drug_losartan_50',
        name: 'Losartan Potassium 50mg Tablets',
        genericName: 'Losartan',
        category: 'Cardiovascular & Antihypertensives',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '50mg',
        unitPrice: 35,
        costPrice: 14,
        stockQuantity: 500,
        reorderLevel: 80,
        requiresPrescription: true,
        description: 'Angiotensin II Receptor Blocker (ARB) for arterial hypertension and diabetic nephropathy.'
    },
    {
        id: 'drug_enalapril_10',
        name: 'Enalapril Maleate 10mg Tablets',
        genericName: 'Enalapril',
        category: 'Cardiovascular & Antihypertensives',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '10mg',
        unitPrice: 20,
        costPrice: 8,
        stockQuantity: 400,
        reorderLevel: 60,
        requiresPrescription: true,
        description: 'ACE inhibitor for cardiac failure and essential hypertension control.'
    },
    {
        id: 'drug_furosemide_40',
        name: 'Furosemide (Lasix) 40mg Tablets',
        genericName: 'Furosemide',
        category: 'Cardiovascular & Diuretics',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '40mg',
        unitPrice: 15,
        costPrice: 5,
        stockQuantity: 450,
        reorderLevel: 70,
        requiresPrescription: true,
        description: 'Loop diuretic for pulmonary edema, congestive heart failure, and fluid retention.'
    },

    // ── Antidiabetics ────────────────────────────────────────────────────────
    {
        id: 'drug_metformin_500',
        name: 'Metformin Hydrochloride 500mg Tablets',
        genericName: 'Metformin',
        category: 'Antidiabetics',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '500mg',
        unitPrice: 15,
        costPrice: 6,
        stockQuantity: 1000,
        reorderLevel: 150,
        requiresPrescription: true,
        description: 'First-line Biguanide oral hypoglycemic agent for Type 2 Diabetes Mellitus.'
    },
    {
        id: 'drug_insulin_actrapid',
        name: 'Insulin Soluble (Actrapid) 100IU/ml (10ml Vial)',
        genericName: 'Human Short-Acting Insulin',
        category: 'Antidiabetics & Endocrine',
        formulation: 'Injectable Vial',
        dosageForm: 'Subcutaneous / IV',
        strength: '100IU/ml',
        unitPrice: 1200,
        costPrice: 750,
        stockQuantity: 45,
        reorderLevel: 10,
        requiresPrescription: true,
        description: 'Short-acting recombinant human insulin for diabetic ketoacidosis and glycemic control.'
    },

    // ── Gastrointestinal & Antacids ──────────────────────────────────────────
    {
        id: 'drug_omeprazole_20',
        name: 'Omeprazole 20mg Delayed-Release Capsules',
        genericName: 'Omeprazole',
        category: 'Gastrointestinal & Antiulcer',
        formulation: 'Capsule',
        dosageForm: 'Oral',
        strength: '20mg',
        unitPrice: 20,
        costPrice: 8,
        stockQuantity: 900,
        reorderLevel: 150,
        requiresPrescription: false,
        description: 'Proton Pump Inhibitor (PPI) for peptic ulcer disease, GERD, and gastritis.'
    },
    {
        id: 'drug_antacid_susp',
        name: 'Antacid Suspension (Magnesium & Aluminum) 200ml',
        genericName: 'Magnesium Hydroxide + Aluminum Hydroxide',
        category: 'Gastrointestinal',
        formulation: 'Oral Liquid Suspension',
        dosageForm: 'Oral',
        strength: 'Standard Formula',
        unitPrice: 180,
        costPrice: 90,
        stockQuantity: 100,
        reorderLevel: 20,
        requiresPrescription: false,
        description: 'Fast-acting neutralizing antacid for heartburn and hyperacidity relief.'
    },
    {
        id: 'drug_ors_sachets',
        name: 'Oral Rehydration Salts (ORS) WHO Formula Sachet',
        genericName: 'Glucose Electrolyte Powder',
        category: 'Gastrointestinal & Rehydration',
        formulation: 'Powder Sachet',
        dosageForm: 'Oral',
        strength: '1 Liter Mix',
        unitPrice: 30,
        costPrice: 10,
        stockQuantity: 800,
        reorderLevel: 100,
        requiresPrescription: false,
        description: 'Essential electrolyte replacement for acute diarrhea, cholera, and dehydration.'
    },

    // ── Respiratory & Antihistamines ──────────────────────────────────────────
    {
        id: 'drug_ventolin_inhaler',
        name: 'Salbutamol (Ventolin) Inhaler 100mcg (200 doses)',
        genericName: 'Salbutamol Sulfate MDI',
        category: 'Respiratory',
        formulation: 'Metered Dose Inhaler',
        dosageForm: 'Inhalation',
        strength: '100mcg/puff',
        unitPrice: 450,
        costPrice: 250,
        stockQuantity: 120,
        reorderLevel: 25,
        requiresPrescription: true,
        description: 'Short-acting Beta-2 agonist bronchodilator for acute asthma exacerbations and bronchospasm.'
    },
    {
        id: 'drug_cetirizine_10',
        name: 'Cetirizine Hydrochloride 10mg Tablets',
        genericName: 'Cetirizine',
        category: 'Antihistamines & Allergy',
        formulation: 'Film-Coated Tablet',
        dosageForm: 'Oral',
        strength: '10mg',
        unitPrice: 15,
        costPrice: 5,
        stockQuantity: 850,
        reorderLevel: 120,
        requiresPrescription: false,
        description: 'Non-drowsy 2nd generation antihistamine for allergic rhinitis, hives, and pruritus.'
    },
    {
        id: 'drug_prednisolone_5',
        name: 'Prednisolone 5mg Tablets',
        genericName: 'Prednisolone',
        category: 'Corticosteroids',
        formulation: 'Tablet',
        dosageForm: 'Oral',
        strength: '5mg',
        unitPrice: 10,
        costPrice: 4,
        stockQuantity: 600,
        reorderLevel: 100,
        requiresPrescription: true,
        description: 'Systemic glucocorticoid steroid for acute allergic reactions, asthma, and autoimmune flare-ups.'
    },

    // ── Vitamins & Supplements ────────────────────────────────────────────────
    {
        id: 'drug_ferrous_folic',
        name: 'Ferrous Sulfate 200mg + Folic Acid 0.4mg Tablets',
        genericName: 'Iron & Folic Acid Supplement',
        category: 'Vitamins & Minerals',
        formulation: 'Coated Tablet',
        dosageForm: 'Oral',
        strength: '200mg/0.4mg',
        unitPrice: 10,
        costPrice: 3,
        stockQuantity: 2000,
        reorderLevel: 300,
        requiresPrescription: false,
        description: 'Hematinic supplement for antenatal iron-deficiency anemia prevention.'
    },
    {
        id: 'drug_zinc_20',
        name: 'Zinc Sulfate 20mg Dispersible Tablets',
        genericName: 'Zinc Sulfate',
        category: 'Vitamins & Minerals',
        formulation: 'Dispersible Tablet',
        dosageForm: 'Oral',
        strength: '20mg',
        unitPrice: 15,
        costPrice: 5,
        stockQuantity: 500,
        reorderLevel: 80,
        requiresPrescription: false,
        description: 'Pediatric zinc therapy co-prescription for acute diarrhea recovery.'
    }
];

/**
 * Ensures HIS Pharmacy inventory is preloaded with essential hospital drugs if empty.
 */
export async function ensureHisPharmacyPreloaded(institutionId: string): Promise<any[]> {
    if (!institutionId) return [];
    try {
        const existing = await apiService.fetchModuleRecords('his_pharmacy_inventory', institutionId);
        if (existing && existing.length > 0) {
            return existing;
        }

        console.log(`[preloadHisDrugs] Preloading ${PRELOADED_HIS_DRUGS.length} essential HIS drugs for institution ${institutionId}...`);
        
        const recordsToSave = PRELOADED_HIS_DRUGS.map(d => {
            const { requiresPrescription, strength, genericName, formulation, dosageForm, costPrice, description, ...cleanRecord } = d as any;
            return {
                ...cleanRecord,
                unit: cleanRecord.unit || cleanRecord.formulation || 'Units',
                unitPrice: cleanRecord.unitPrice || 10,
                reorderLevel: cleanRecord.reorderLevel || 20,
                stockQuantity: cleanRecord.stockQuantity || 100,
                institutionId,
                institution_id: institutionId,
                created_at: new Date().toISOString()
            };
        });

        await apiService.saveModuleRecords('his_pharmacy_inventory', recordsToSave).catch(async () => {
            for (const rec of recordsToSave) {
                await apiService.saveModuleRecord('his_pharmacy_inventory', rec).catch(() => null);
            }
        });

        const updated = await apiService.fetchModuleRecords('his_pharmacy_inventory', institutionId);
        return updated && updated.length > 0 ? updated : recordsToSave;
    } catch (err) {
        console.warn('[preloadHisDrugs] Preload note:', err);
        return PRELOADED_HIS_DRUGS.map(d => ({ ...d, institutionId }));
    }
}
