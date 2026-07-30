export const createVariableResolverService = () => {
  const replaceVariables = (html, variables = {}) => {
    if (!html) return '';
    let rendered = html;

    const mappings = {
      '{{phone}}': variables.phone || '',
      '{{country}}': variables.country || '',
      '{{operator}}': variables.operator || '',
      '{{service_id}}': variables.service_id || '',
      '{{plan}}': variables.plan || '',
      '{{pack}}': variables.plan || '',
    };

    for (const [placeholder, value] of Object.entries(mappings)) {
      rendered = rendered.split(placeholder).join(value);
    }

    return rendered;
  };

  return { replaceVariables };
};

export const variableResolverService = createVariableResolverService();
