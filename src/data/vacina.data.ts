export interface VaccineDescription {
  name: string;
  description: string;
  dosage: number;
}

export interface VaccinationData {
  category: string;
  message: string;
  vaccines: VaccineDescription[];
}

export const vacinacao: VaccinationData[] = [
  {
    category: 'crianca',
    message:
      'Para vacinar, basta levar a criança a um posto ou Unidade Básica de Saúde (UBS) com o cartão da criança. O ideal é que toda dose seja administrada na idade recomendada mas, se perdeu o prazo vá à unidade de saúde e atualize as vacinas.',
    vaccines: [
      {
        name: 'BCG (Bacilo Calmette-Guerin)',
        description:
          'Previne as formas graves de tuberculose, principalmente miliar e meníngea',
        dosage: 1,
      },
      {
        name: 'Hepatite B',
        description: 'Previne a hepatite do tipo B',
        dosage: 1,
      },
      {
        name: 'Pentavalente (DTP/HB/Hib)',
        description:
          'Previne difteria, tétano, coqueluche, hepatite B e meningite e infecções por HiB',
        dosage: 3,
      },
      {
        name: 'VIP (Poliomielite inativada)',
        description: 'Previne poliomielite ou paralisia infantil',
        dosage: 3,
      },
    ],
  },
];
