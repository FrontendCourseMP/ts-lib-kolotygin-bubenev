import type {
  FormField,
  ValidationRule,
  ValidatorConfig,
  BuiltInRule,
  SimpleValidator,
  FormResult,
  FieldResult,
} from "./types";

class Validus implements SimpleValidator {
  private config: ValidatorConfig;
  private rules: Record<string, (ValidationRule | BuiltInRule)[]> = {};
  private errorContainers: Map<string, HTMLElement> = new Map();
  private form: HTMLFormElement;

  constructor(config: ValidatorConfig) {
    this.config = config;
    this.form = config.form;
    this.rules = config.rules || {};

    this.initialize();
  }

  private initialize(): void {
    this.findErrorContainers();
    this.setupEventListeners();
    this.setupDefaultMessages();
  }

  private findErrorContainers(): void {
    const fields = this.form.querySelectorAll<FormField>(
      "input, textarea, select"
    );

    fields.forEach((field) => {
      const fieldName = field.name;
      if (!fieldName) return;

      // Ищем контейнер для ошибок по id или data-атрибуту
      let errorContainer = document.getElementById(`error-${fieldName}`);

      if (!errorContainer) {
        // Пробуем найти по data-атрибуту
        errorContainer = this.form.querySelector(
          `[data-error-for="${fieldName}"]`
        );
      }

      if (!errorContainer && field.id) {
        // Пробуем найти связанный label для отображения ошибок
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) {
          // Создаем элемент для ошибок рядом с label
          const errorEl = document.createElement("div");
          errorEl.className = "validus-error";
          errorEl.id = `error-${fieldName}`;
          label.parentNode?.insertBefore(errorEl, label.nextSibling);
          errorContainer = errorEl;
        }
      }

      if (errorContainer) {
        this.errorContainers.set(fieldName, errorContainer);
      }
    });
  }

  private setupEventListeners(): void {
    const { events = {} } = this.config;

    if (events.onInput) {
      this.form.addEventListener("input", (e) => {
        const target = e.target as FormField;
        if (target.name && this.rules[target.name]) {
          this.validateField(target.name);
        }
      });
    }

    if (events.onBlur) {
      this.form.addEventListener(
        "blur",
        (e) => {
          const target = e.target as FormField;
          if (target.name && this.rules[target.name]) {
            this.validateField(target.name);
          }
        },
        true
      );
    }

    if (events.onSubmit) {
      this.form.addEventListener("submit", (e) => {
        const result = this.validate();
        if (!result.isValid) {
          e.preventDefault();
          this.showErrors();
        }
      });
    }
  }

  private setupDefaultMessages(): void {
    // Настройка сообщений по умолчанию из атрибутов HTML5
    const fields = this.form.querySelectorAll<FormField>(
      "input, textarea, select"
    );

    fields.forEach((field) => {
      const fieldName = field.name;
      if (!fieldName) return;

      // Проверяем стандартные атрибуты валидации
      if (field.required && !this.hasRule(fieldName, "required")) {
        const message =
          field.getAttribute("data-error-required") || "Это поле обязательно";
        this.addRule(fieldName, { type: "required", message });
      }

      if (field.type === "email" && !this.hasRule(fieldName, "email")) {
        const message =
          field.getAttribute("data-error-email") || "Неверный формат email";
        this.addRule(fieldName, { type: "email", message });
      }

      // Check if field supports minLength (only input and textarea elements)
      if (
        (field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement) &&
        field.minLength &&
        !this.hasRule(fieldName, "minLength")
      ) {
        const message =
          field.getAttribute("data-error-minlength") ||
          `Минимум ${field.minLength} символов`;
        this.addRule(fieldName, {
          type: "minLength",
          value: field.minLength,
          message,
        });
      }

      // Check if field supports maxLength (only input and textarea elements)
      if (
        (field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement) &&
        field.maxLength &&
        !this.hasRule(fieldName, "maxLength")
      ) {
        const message =
          field.getAttribute("data-error-maxlength") ||
          `Максимум ${field.maxLength} символов`;
        this.addRule(fieldName, {
          type: "maxLength",
          value: field.maxLength,
          message,
        });
      }

      // Check if field supports pattern (only input elements typically use pattern)
      if (
        field instanceof HTMLInputElement &&
        field.pattern &&
        !this.hasRule(fieldName, "custom")
      ) {
        const message =
          field.getAttribute("data-error-pattern") || "Неверный формат";
        this.addRule(fieldName, {
          type: "custom",
          validator: (value) => new RegExp(field.pattern).test(value),
          message,
        });
      }
    });
  }

  private hasRule(fieldName: string, ruleType: string): boolean {
    const rules = this.rules[fieldName] || [];
    return rules.some(
      (rule) =>
        typeof rule === "object" && "type" in rule && rule.type === ruleType
    );
  }

  private validateWithRule(
    value: string,
    field: FormField,
    rule: BuiltInRule | ValidationRule
  ): boolean | string {
    // Если правило - встроенное
    if ("type" in rule) {
      const builtInRule = rule as BuiltInRule;

      switch (builtInRule.type) {
        case "required":
          if (!value.trim())
            return builtInRule.message || "Это поле обязательно";
          break;

        case "email": {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value))
            return builtInRule.message || "Неверный формат email";
          break;
        }

        case "minLength":
          if (value.length < builtInRule.value) {
            return (
              builtInRule.message || `Минимум ${builtInRule.value} символов`
            );
          }
          break;

        case "maxLength":
          if (value.length > builtInRule.value) {
            return (
              builtInRule.message || `Максимум ${builtInRule.value} символов`
            );
          }
          break;

        case "number":
          if (isNaN(Number(value)) || value.trim() === "") {
            return builtInRule.message || "Должно быть числом";
          }
          break;

        case "url":
          try {
            new URL(value);
          } catch {
            return builtInRule.message || "Неверный формат URL";
          }
          break;

        case "tel": {
          const phoneRegex = /^[+]?[0-9\s\-()]+$/;
          if (!phoneRegex.test(value))
            return builtInRule.message || "Неверный формат телефона";
          break;
        }

        case "match": {
          const fieldToMatch = this.form.querySelector<FormField>(
            `[name="${builtInRule.fieldToMatch}"]`
          );
          if (fieldToMatch && value !== fieldToMatch.value) {
            return builtInRule.message || "Поля не совпадают";
          }
          break;
        }

        case "custom":
          if (builtInRule.validator) {
            const result = builtInRule.validator(value);
            if (result !== true) {
              return (
                builtInRule.message ||
                (typeof result === "string" ? result : "Неверное значение")
              );
            }
          }
          break;
      }
    } else {
      // Пользовательское правило
      const customRule = rule as ValidationRule;
      const result = customRule.test(value, field, "");
      if (result !== true) {
        return typeof result === "string" ? result : "Неверное значение";
      }
    }

    return true;
  }

  validate(): FormResult {
    const fields: Record<string, FieldResult> = {};
    const allErrors: string[] = [];
    let isValid = true;

    Object.keys(this.rules).forEach((fieldName) => {
      const fieldResult = this.validateField(fieldName);
      fields[fieldName] = fieldResult;

      if (!fieldResult.isValid) {
        isValid = false;
        allErrors.push(...fieldResult.errors);
      }
    });

    return {
      isValid,
      fields,
      errors: allErrors,
    };
  }

  validateField(fieldName: string): FieldResult {
    const field = this.form.querySelector<FormField>(`[name="${fieldName}"]`);
    if (!field) {
      throw new Error(`Поле с именем "${fieldName}" не найдено`);
    }

    const rules = this.rules[fieldName] || [];
    const errors: string[] = [];
    let fieldIsValid = true;

    // Для чекбоксов и радио берем checked значения
    let value: string;
    if (field.type === "checkbox" || field.type === "radio") {
      if (field.type === "checkbox") {
        const checkboxes = this.form.querySelectorAll<HTMLInputElement>(
          `[name="${fieldName}"]:checked`
        );
        value = Array.from(checkboxes)
          .map((cb) => cb.value)
          .join(",");
      } else {
        const radio = this.form.querySelector<HTMLInputElement>(
          `[name="${fieldName}"]:checked`
        );
        value = radio ? radio.value : "";
      }
    } else {
      value = field.value;
    }

    // Проверяем каждое правило
    for (const rule of rules) {
      const result = this.validateWithRule(value, field, rule);
      if (result !== true) {
        fieldIsValid = false;
        errors.push(typeof result === "string" ? result : "Неверное значение");
      }
    }

    // Обновляем UI
    this.updateFieldUI(fieldName, fieldIsValid, errors);

    return {
      isValid: fieldIsValid,
      errors,
      field,
    };
  }

  private updateFieldUI(
    fieldName: string,
    isValid: boolean,
    errors: string[]
  ): void {
    const field = this.form.querySelector<FormField>(`[name="${fieldName}"]`);
    if (!field) return;

    // Добавляем/удаляем CSS классы
    field.classList.remove("validus-valid", "validus-invalid");
    field.classList.add(isValid ? "validus-valid" : "validus-invalid");

    // Обновляем сообщения об ошибках
    const errorContainer = this.errorContainers.get(fieldName);
    if (errorContainer) {
      errorContainer.innerHTML = "";
      errorContainer.className = "validus-error";

      if (!isValid && errors.length > 0) {
        errorContainer.classList.add("visible");
        errors.forEach((error) => {
          const errorEl = document.createElement("div");
          errorEl.className = "validus-error-message";
          errorEl.textContent = error;
          errorContainer.appendChild(errorEl);
        });
      } else {
        errorContainer.classList.remove("visible");
      }
    }
  }

  addRule(fieldName: string, rule: BuiltInRule | ValidationRule): void {
    if (!this.rules[fieldName]) {
      this.rules[fieldName] = [];
    }
    this.rules[fieldName].push(rule);
  }

  clearRules(fieldName: string): void {
    delete this.rules[fieldName];
    this.updateFieldUI(fieldName, true, []);
  }

  showErrors(): void {
    Object.keys(this.rules).forEach((fieldName) => {
      this.validateField(fieldName);
    });
  }

  hideErrors(): void {
    this.errorContainers.forEach((container) => {
      container.classList.remove("visible");
      container.innerHTML = "";
    });

    const fields = this.form.querySelectorAll<FormField>(
      "input, textarea, select"
    );
    fields.forEach((field) => {
      field.classList.remove("validus-valid", "validus-invalid");
    });
  }

  reset(): void {
    this.hideErrors();
    this.form.reset();
  }

  destroy(): void {
    this.hideErrors();

    // Удаляем обработчики событий
    const formClone = this.form.cloneNode(true);
    this.form.parentNode?.replaceChild(formClone, this.form);

    // Очищаем контейнеры ошибок
    this.errorContainers.clear();
  }
}

// Экспортируем как класс FormValidator для совместимости с типами
export { Validus as FormValidator };
export default Validus;
