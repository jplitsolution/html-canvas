import { Injectable } from '@nestjs/common';

@Injectable()
export class VariableResolverService {
  /**
   * Replaces placeholders like {{phone}}, {{country}}, {{operator}}, {{service_id}} inside the HTML.
   */
  replaceVariables(html: string, variables: Record<string, string | undefined>): string {
    if (!html) return '';
    let rendered = html;
    
    const mappings: Record<string, string> = {
      '{{phone}}': variables.phone || '',
      '{{country}}': variables.country || '',
      '{{operator}}': variables.operator || '',
      '{{service_id}}': variables.service_id || '',
    };

    for (const [placeholder, value] of Object.entries(mappings)) {
      // Use standard split-join to replace all occurrences without regex escaping issues
      rendered = rendered.split(placeholder).join(value);
    }

    return rendered;
  }
}
