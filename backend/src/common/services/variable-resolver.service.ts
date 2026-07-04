import { Injectable } from '@nestjs/common';

@Injectable()
export class VariableResolverService {
  replaceVariables(
    html: string,
    variables: Record<string, string | undefined>,
  ): string {
    if (!html) return '';
    let rendered = html;

    const mappings: Record<string, string> = {
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
  }
}
