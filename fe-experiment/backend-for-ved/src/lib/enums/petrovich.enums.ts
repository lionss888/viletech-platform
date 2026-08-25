// Падежи
export enum PetrovichCaseType {
  NOMINATIVE = 'nominative', // именительный (кто? что?)
  GENITIVE = 'genitive', // родительный (кого? чего?)
  DATIVE = 'dative', // дательный (кому? чему?)
  ACCUSATIVE = 'accusative', // винительный (кого? что?)
  INSTRUMENTAL = 'instrumental', // творительный (кем? чем?)
  PREPOSITIONAL = 'prepositional', // предложный (о ком? о чем?)
}

// Гендеры
export enum PetrovichGenderType {
  MALE = 'male', // мужской
  FEMALE = 'female', // женский
  ANDROGYNOUS = 'androgynous', // неопределенный
}
