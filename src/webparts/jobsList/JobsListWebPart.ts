import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart, WebPartContext } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'JobsListWebPartStrings';
import JobsList from './components/JobsList/JobsList.cmp';
import { IJobsListProps } from './components/JobsList/JobsList.cmp';
import { PropertyFieldListPicker, PropertyFieldListPickerOrderBy, PropertyFieldNumber } from '@pnp/spfx-property-controls';
import { SPFI } from '@pnp/sp';
import { getSP } from '../../pnp.config';
const { solution } = require("../../../config/package-solution.json");

export interface IJobsListWebPartProps {
  JobListId: string;
  JobApplicationsListId: string;
  JobsApplicationsListId: string;
  sp: SPFI;
  contextHR: any;
  context: WebPartContext;
  Title: string;
  pageItemsNumber: number;
}

export default class JobsListWebPart extends BaseClientSideWebPart<IJobsListWebPartProps> {


  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = '';

  private sp: SPFI

  public render(): void {
    const element: React.ReactElement<IJobsListProps> = React.createElement(
      JobsList,
      {
        JobListId: this.properties.JobListId,
        JobApplicationsListId: this.properties.JobApplicationsListId,
        JobsApplicationsListId: this.properties.JobsApplicationsListId,
        sp: this.sp,
        context: this.context,
        Title: this.properties.Title,
        pageItemsNumber: this.properties.pageItemsNumber
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onInit(): Promise<void> {
    this.sp = getSP(this.context)
    return this._getEnvironmentMessage().then(message => {
      this._environmentMessage = message;
    });
  }



  private _getEnvironmentMessage(): Promise<string> {
    if (!!this.context.sdks.microsoftTeams) { // running in Teams, office.com or Outlook
      return this.context.sdks.microsoftTeams.teamsJs.app.getContext()
        .then(context => {
          let environmentMessage: string = '';
          switch (context.app.host.name) {
            case 'Office': // running in Office
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOffice : strings.AppOfficeEnvironment;
              break;
            case 'Outlook': // running in Outlook
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentOutlook : strings.AppOutlookEnvironment;
              break;
            case 'Teams': // running in Teams
            case 'TeamsModern':
              environmentMessage = this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentTeams : strings.AppTeamsTabEnvironment;
              break;
            default:
              environmentMessage = strings.UnknownEnvironment;
          }

          return environmentMessage;
        });
    }

    return Promise.resolve(this.context.isServedFromLocalhost ? strings.AppLocalEnvironmentSharePoint : strings.AppSharePointEnvironment);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const {
      semanticColors
    } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }

  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    // console.log("JobsListWebPart version:", solution.version);
    return Version.parse(solution.version);
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                }),
                PropertyPaneTextField('Title', {
                  label: "Title"
                }),
                PropertyFieldListPicker("JobListId", {
                  label: "Select Jobs list",
                  selectedList: this.properties.JobListId,
                  includeHidden: false,
                  orderBy: PropertyFieldListPickerOrderBy.Title,
                  disabled: false,
                  onPropertyChange: this.onPropertyPaneFieldChanged.bind(this),
                  properties: this.properties,
                  context: this.context as any,
                  deferredValidationTime: 0,
                  key: "listPickerFieldId",
                }),
                PropertyPaneTextField('JobsApplicationsListId', {
                  label: "Select Jobs list applications",
                  value: this.properties.JobApplicationsListId
                }),
                PropertyFieldNumber("pageItemsNumber", {
                  key: "pageItemsNumber",
                  label: "page Items Number",
                  description: "How much items in one page",
                  value: this.properties.pageItemsNumber,
                  disabled: false
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
