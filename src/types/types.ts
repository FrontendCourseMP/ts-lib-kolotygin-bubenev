// ==================== БАЗОВЫЕ ТИПЫ ====================

/** Элемент формы для валидации с поддержкой min/maxLength */
export type FormFieldWithLength = HTMLInputElement | HTMLTextAreaElement;

/** Все элементы формы для валидации */
export type FormField = FormFieldWithLength | HTMLSelectElement;

/** Простое правило валидации */
export interface ValidationRule {
  /** Проверка поля (возвращает true если валидно, false или строку с ошибкой если нет) */
  test: (value: string, field: FormField, message: string) => boolean | string;
}

/** Правила для одного поля */
export type FieldRules = Record<string, ValidationRule[]>;

/** Сообщения об ошибках */
export type ErrorMessages = Record<string, string[]>;

/** Результат валидации одного поля */
export interface FieldResult {
  isValid: boolean;
  errors: string[];
  field: FormField;
}

/** Результат валидации всей формы */
export interface FormResult {
  isValid: boolean;
  fields: Record<string, FieldResult>;
  errors: string[];
}

/** Конфигурация валидатора */
export interface ValidatorConfig {
  /** Элемент формы */
  form: HTMLFormElement;
  /** Правила для полей */
  rules?: FieldRules;
  /** События для валидации */
  events?: {
    onInput?: boolean;
    onBlur?: boolean;
    onSubmit?: boolean;
  };
}

// ==================== ВСТРОЕННЫЕ ПРАВИЛА ====================

/** Предопределенные правила (как в Just-Validate) */
export type BuiltInRule = 
  | { type: 'required'; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'number'; message?: string }
  | { type: 'url'; message?: string }
  | { type: 'tel'; message?: string }
  | { type: 'match'; fieldToMatch: string; message?: string }
  | { type: 'custom'; validator: (value: string) => boolean | string; message?: string };

// ==================== ИНТЕРФЕЙС ВАЛИДАТОРА ====================

/** Основной интерфейс валидатора */
export interface SimpleValidator {
  /** Валидировать всю форму */
  validate(): FormResult;
  
  /** Валидировать одно поле */
  validateField(fieldName: string): FieldResult;
  
  /** Добавить правило к полю */
  addRule(fieldName: string, rule: BuiltInRule | ValidationRule): void;
  
  /** Удалить все правила поля */
  clearRules(fieldName: string): void;
  
  /** Показать ошибки */
  showErrors(): void;
  
  /** Скрыть ошибки */
  hideErrors(): void;
  
  /** Сбросить валидацию */
  reset(): void;
  
  /** Уничтожить валидатор (удалить обработчики) */
  destroy(): void;
}

// ==================== КЛАСС ВАЛИДАТОРА ====================

/** Основной класс валидатора */
export declare class FormValidator implements SimpleValidator {
  constructor(config: ValidatorConfig);
  
  validate(): FormResult;
  validateField(fieldName: string): FieldResult;
  addRule(fieldName: string, rule: BuiltInRule | ValidationRule): void;
  clearRules(fieldName: string): void;
  showErrors(): void;
  hideErrors(): void;
  reset(): void;
  destroy(): void;
}

// Экспорт по умолчанию для совместимости
export type { FormValidator as default };