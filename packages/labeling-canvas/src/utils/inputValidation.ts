/**
 * inputValidation.ts
 *
 * Input validation specs for each input type.
 */

export interface InputSpec {
  placeholder: string;
  regex: RegExp;
  maxLength?: number;
  minLength?: number;
  description?: string;
}

export const INPUT_VALIDATION_KEYS = [
  "Name",
  "Tag",
  "Option",
  "Description",
  "Class",
  "Element",
  "Attribute",
  "Range",
] as const;

export const INPUT_VALIDATION: Record<
  (typeof INPUT_VALIDATION_KEYS)[number],
  InputSpec
> = {
  Name: {
    placeholder: "2-30 chars, -, _ allowed",
    regex: /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ _-]{2,30}$/,
    minLength: 2,
    maxLength: 30,
    description: "2-30자, 한글/영문/숫자/공백/-,_ 허용. 그 외 특수문자 불가.",
  },
  Tag: {
    placeholder: "max 5 tags, each 1-10 chars, comma sep.",
    regex: /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]{1,10}$/,
    minLength: 1,
    maxLength: 10,
    description:
      "1-10자, 한글/영문/숫자만 허용. 특수문자·공백 불가. 최대 5개, 중복 불가.",
  },
  Option: {
    placeholder: "1-30 chars, comma sep.",
    regex: /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]{1,30}$/,
    minLength: 1,
    maxLength: 30,
    description: "1-30자, 한글/영문/숫자 허용. 특수문자 불가.",
  },
  Description: {
    placeholder: "max 500 chars",
    regex: /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ.,!?()\-\s ]{0,500}$/,
    minLength: 0,
    maxLength: 500,
    description:
      "최대 500자. 한글/영문/숫자/공백/기본 특수문자(.,!?-()) 허용. 줄바꿈 가능.",
  },
  Class: {
    placeholder: "2-20 chars",
    regex: /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ ]{2,20}$/,
    minLength: 2,
    maxLength: 20,
    description: "2-20자, 한글/영문/숫자/공백 허용. 특수문자 불가.",
  },
  Element: {
    placeholder: "2-50 chars",
    regex:
      /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]{2,50}$/,
    minLength: 2,
    maxLength: 50,
    description: "2-50자, 한글/영문/숫자/공백/특수문자 허용.",
  },
  Attribute: {
    placeholder: "2-20 chars, letters, numbers, spaces allowed.",
    regex: /^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ ]{2,20}$/,
    minLength: 2,
    maxLength: 20,
    description: "2-20자, 한글/영문/숫자/공백 허용.",
  },
  Range: {
    placeholder: "max 10 chars, . allowed",
    regex: /^[0-9.]{1,10}$/,
    minLength: 1,
    maxLength: 10,
    description: "최대 10자, 숫자/소수점만 허용.",
  },
};

export function filterInputValue(
  type: keyof typeof INPUT_VALIDATION,
  value: string
) {
  const patterns = {
    Name: /[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ _-]/g,
    Tag: /[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ,]/g,
    Option: /[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g,
    Description: /[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ.,!?()\-\s ]/g,
    Class: /[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ ]/g,
    Element: /[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g,
    Attribute: /[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ ]/g,
    Range: /[^0-9.]/g,
  } as const;

  return value.replace(patterns[type], "");
}
