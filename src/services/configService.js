import { supabase } from '../lib/supabase';

// Default static fallback configuration if DB query is connecting
export const DEFAULT_CONFIG = {
  sessions: ['Annual I', 'Annual II'],
  admissionTypes: [
    { code: 'REGULAR', name: 'Regular' },
    { code: 'PRIVATE', name: 'Private' },
    { code: 'COMBINE', name: 'Combine (Gap)' }
  ],
  programGroups: {
    'Private': [
      'Private Computer Science',
      'Private Science',
      'Commerce Private',
      'General Private',
      'Humanities Private'
    ],
    'Regular': [
      'Commerce Regular',
      'Computer Science',
      'General Regular',
      'General Science Regular',
      'Humanities Regular',
      'Pre Engineering Regular',
      'Pre Medical Regular',
      'Science Regular'
    ],
    'Combine (Gap)': [
      'Commerce Private',
      'Computer Science Private',
      'General Private',
      'General Science Private',
      'Humanities Private',
      'Pre Engineering Private',
      'Pre Medical Private',
      'Science Private'
    ]
  },
  academicClasses: {
    'Regular': ['IX', 'X', 'XI', 'XII'],
    'Private': ['IX', 'X', 'XI', 'XII'],
    'Combine (Gap)': ['IX, X Combine', 'XI, XII Combine']
  }
};

/**
 * Fetch dynamic configuration from Supabase
 */
export async function getAdmissionConfig() {
  try {
    const [typesRes, programsRes, classesRes] = await Promise.all([
      supabase.from('admission_types').select('*').eq('is_active', true).order('display_order'),
      supabase.from('program_groups').select('*').eq('is_active', true).order('display_order'),
      supabase.from('academic_classes').select('*').eq('is_active', true).order('display_order')
    ]);

    if (typesRes.error || programsRes.error || classesRes.error) {
      console.warn('Using fallback config due to database error:', typesRes.error || programsRes.error || classesRes.error);
      return DEFAULT_CONFIG;
    }

    const typeCodeToName = {};
    typesRes.data.forEach(t => {
      typeCodeToName[t.code] = t.name;
    });

    const programGroups = {
      'Regular': [],
      'Private': [],
      'Combine (Gap)': []
    };

    programsRes.data.forEach(p => {
      const typeName = typeCodeToName[p.admission_type_code] || p.admission_type_code;
      if (!programGroups[typeName]) programGroups[typeName] = [];
      programGroups[typeName].push(p.name);
    });

    const academicClasses = {
      'Regular': [],
      'Private': [],
      'Combine (Gap)': []
    };

    classesRes.data.forEach(c => {
      const typeName = typeCodeToName[c.admission_type_code] || c.admission_type_code;
      if (!academicClasses[typeName]) academicClasses[typeName] = [];
      academicClasses[typeName].push(c.class_name);
    });

    return {
      sessions: ['Annual I', 'Annual II'],
      admissionTypes: typesRes.data.map(t => ({ code: t.code, name: t.name })),
      programGroups,
      academicClasses
    };
  } catch (err) {
    console.error('Failed to load admission config:', err);
    return DEFAULT_CONFIG;
  }
}

/**
 * Fetch all raw config tables for Admin Manager page
 */
export async function getRawAdminConfig() {
  try {
    const [typesRes, programsRes, classesRes] = await Promise.all([
      supabase.from('admission_types').select('*').order('display_order'),
      supabase.from('program_groups').select('*').order('display_order'),
      supabase.from('academic_classes').select('*').order('display_order')
    ]);

    return {
      admissionTypes: typesRes.data || [],
      programGroups: programsRes.data || [],
      academicClasses: classesRes.data || []
    };
  } catch (err) {
    console.error('getRawAdminConfig error:', err);
    throw err;
  }
}

/**
 * Add a new program group
 */
export async function addProgramGroup({ admissionTypeCode, name, displayOrder = 99 }) {
  const { data, error } = await supabase
    .from('program_groups')
    .insert([{
      admission_type_code: admissionTypeCode,
      name: name.trim(),
      display_order: Number(displayOrder) || 99,
      is_active: true
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete or toggle program group
 */
export async function deleteProgramGroup(id) {
  const { error } = await supabase
    .from('program_groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Add a new academic class
 */
export async function addAcademicClass({ admissionTypeCode, className, displayOrder = 99 }) {
  const { data, error } = await supabase
    .from('academic_classes')
    .insert([{
      admission_type_code: admissionTypeCode,
      class_name: className.trim(),
      display_order: Number(displayOrder) || 99,
      is_active: true
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete academic class
 */
export async function deleteAcademicClass(id) {
  const { error } = await supabase
    .from('academic_classes')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
