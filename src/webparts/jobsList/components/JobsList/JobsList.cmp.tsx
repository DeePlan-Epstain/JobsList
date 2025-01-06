import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SPFI, SPFx, spfi } from '@pnp/sp';
import { Pagination, TextField, Collapse, Modal, Box, Typography, Button, InputAdornment, IconButton, List, ListItem, ListItemText, ListItemAvatar } from '@mui/material'
import styles from './JobsList.module.scss';
import './JobsLists.css'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Divider from '@mui/material/Divider';
import CircularProgress from "@mui/material/CircularProgress";
import { PeoplePicker } from "@pnp/spfx-controls-react/lib/PeoplePicker"
import FolderIcon from '@mui/icons-material/Folder';
import Avatar from '@mui/material/Avatar';
import Swal from "sweetalert2";
const MainBackground = require('../../assets/MainBackground.png')
export interface IJobsListProps {
    JobListId: string;
    JobApplicationsListId: string;
    JobsApplicationsListId: string;
    sp: SPFI;
    context: WebPartContext;
    Title: string;
    pageItemsNumber: number;
}

interface Job {
    ID: number;
    inchargeRecruiterNameId: number;
    isDisplay: boolean;
    jobDescription: string;
    isExpanded: boolean;
    jobName: string;
    jobRequirements: string;
    jobType: string;
    exprience: string;
    emphasis: string;
}

interface Applicant {
    ID: number;
    jobName: string;
    inchargeRecruiterNameId: number;
    requiredExperience: string;
    jobType: string;
    employeeName: string | undefined;
    email: string;
    phone: string;
    notes: string;
    applicationStatus: string;
    applicantNameId: number;
}

interface JobsListState {
    currUser: any,
    JobsList: Job[];
    filteredJobs: Job[];
    inchargeRecruiterUser: any;
    isLoading: boolean;
    expanded: any;
    userDetails: any;
    activeButtons: any;
    CollapseText: any;
    ApplicantState: Applicant;
    isSaving: boolean;
    filesList: any[];
    validateForm: boolean;
    employeeNameValidationError: boolean;
    inchargeRecruiterNameValidationError: boolean;
    emailValidationError: boolean;
    phoneValidationError: boolean;
    spHR: SPFI | null;
}

export default function JobsList({ ...props }: IJobsListProps) {
    const { JobListId, JobsApplicationsListId, sp, Title, pageItemsNumber, context } = props;
    const [state, setState] = React.useState<JobsListState>({
        currUser: null,
        JobsList: [],
        filteredJobs: [],
        inchargeRecruiterUser: null,
        isLoading: false,
        expanded: {},
        userDetails: {},
        activeButtons: {},
        CollapseText: {},

        ApplicantState: {
            ID: 0,
            jobName: "",
            inchargeRecruiterNameId: 0,
            requiredExperience: "",
            jobType: "",
            employeeName: undefined,
            email: "",
            phone: "",
            notes: "",
            applicationStatus: "",
            applicantNameId: 0
        },
        isSaving: false,
        filesList: [],
        validateForm: false,
        employeeNameValidationError: false,
        inchargeRecruiterNameValidationError: false,
        emailValidationError: false,
        phoneValidationError: false,
        spHR: null
    });

    // Handle the Modal
    const [openModalJobId, setOpenModalJobId] = React.useState<number | null>(null);
    const handleOpen = (jobId: number) => setOpenModalJobId(jobId);
    const handleClose = () => {
        setState(prevState => ({
            ...prevState,
            ApplicantState: {
                ...prevState.ApplicantState,
                ID: 0,
                jobName: "",
                inchargeRecruiterNameId: 0,
                requiredExperience: "",
                jobType: "",
                employeeName: "",
                email: "",
                phone: "",
                notes: "",
                applicationStatus: "",
                applicantNameId: 0
            },
            filesList: [],
            isSaving: false,
            validateForm: false,
            employeeNameValidationError: false,
            inchargeRecruiterNameValidationError: false,
            emailValidationError: false,
            phoneValidationError: false,
        }));
        setOpenModalJobId(null)
    };

    // Handlde the Pagination
    const [currentPage, setCurrentPage] = React.useState(1);
    const handlePageChange = (event: any, value: any) => setCurrentPage(value);

    React.useEffect(() => {
        console.clear();
        createBackgroundStyles()
        handleClose()
        setState(prevState => ({
            ...prevState,
            isLoading: true
        }));
        getJobsList();

        return () => {
            createBackgroundStyles(true);
        };
    }, []);

    // Generic onChange
    const onChange = (e: any) => {
        const { name, value } = e.target;

        if (name === "employeeName") {
            setState(prevState => ({
                ...prevState,
                employeeNameValidationError: value === ""
            }));
        }
        if (name === "email") {
            // Email validation
            setState(prevState => ({
                ...prevState,
                emailValidationError: value === "" || value === undefined
            }));
        }
        if (name === "phone") {
            // Phone validation
            setState(prevState => ({
                ...prevState,
                phoneValidationError: value === "" || value === undefined
            }));
        }

        setState(prevState => ({
            ...prevState,
            ApplicantState: {
                ...prevState.ApplicantState,
                [name]: value === "" ? null : value,
            },
        }));
    };


    const createBackgroundStyles = (isClose?: boolean) => {
        let styleEl: any = document.getElementById("JobsListBackground");

        if (isClose) {
            document.head.removeChild(styleEl);
            return;
        }

        styleEl = document.createElement("style");
        styleEl.id = "JobsListBackground";
        styleEl.textContent = `
        div[data-automation-id="CanvasLayout"] div.CanvasZone {
            background-image: url(${MainBackground}) !important;
            background-repeat: no-repeat !important;
            background-size: cover !important;
            background-position: center !important;
        }
        `;
        document.head.appendChild(styleEl);
    };

    const getJobsList = async () => {
        setState(prevState => ({ ...prevState, isLoading: true }));

        const currUser = await sp.web.currentUser()

        const jobs = await sp.web.lists.getById(JobListId).items
            .select('ID', 'inchargeRecruiterNameId', 'isDisplay', 'jobDescription', 'jobName', 'jobRequirements', 'jobType', 'exprience', 'emphasis', 'isDisplay')
            .orderBy('Index').getAll();

        const displayableJobs = jobs.filter(item => item.isDisplay);

        // Initialize activeButtons and CollapseText for each job
        const initialActiveButtons: any = {};
        const initialCollapseTexts: any = {};

        displayableJobs.forEach(job => {
            initialActiveButtons[job.ID] = 'jobDescription'; // Set jobDescription as default active button
            initialCollapseTexts[job.ID] = job.jobDescription; // Set jobDescription text as default
        });

        // Initialize an empty object for userDetails
        const userDetails: any = {};
        const userFetchPromises = displayableJobs.map(async (job) => {
            const userPrincipalName = await getUser(job.inchargeRecruiterNameId);
            userDetails[job.ID] = userPrincipalName; // Ensure the key is a string
        });

        // Wait for all promises to resolve
        await Promise.all(userFetchPromises);
        const spHR = await spfi("").using(SPFx(context))

        setState(prevState => ({
            ...prevState,
            currUser: currUser,
            JobsList: displayableJobs,
            filteredJobs: displayableJobs,
            isLoading: false,
            userDetails, // Assuming this is populated correctly
            activeButtons: initialActiveButtons,
            CollapseText: initialCollapseTexts,
            spHR: spHR
        }));
    };

    const onChangeSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // Filter the original JobsList, not the state variable directly
        let items = state.JobsList.filter(item => item.jobName.toLowerCase().includes(e.target.value.toLowerCase()));

        // Update the filtered jobs list
        setState(prevState => ({
            ...prevState,
            filteredJobs: items,
        }));
    }

    const handleButtonClick = (itemId: number, buttonKey: string) => {
        let newText = '';
        const job = state.JobsList.find(job => job.ID === itemId);

        if (job) {
            switch (buttonKey) {
                case 'jobDescription':
                    newText = job.jobDescription;
                    break;
                case 'jobRequirements':
                    newText = job.jobRequirements;
                    break;
                case 'emphasis':
                    newText = job.emphasis;
                    break;
                default:
                    newText = ''; // Or some default message
            }
        }

        setState(prevState => ({
            ...prevState,
            activeButtons: {
                ...prevState.activeButtons,
                [itemId]: buttonKey, // Mark the button as active
            },
            CollapseText: {
                ...prevState.CollapseText,
                [itemId]: newText, // Update the text to be shown in the Collapse component
            },
            expanded: {
                ...prevState.expanded,
                [itemId]: true, // Toggle the state
            }
        }));
    };

    const toggleExpand = (id: number) => {
        const newItems = state.JobsList.map(J => {
            if (J.ID === id) {
                J.isExpanded = !J.isExpanded;
                return J;
            }
            // J.isExpanded = false;
            return J;
        });
        // Toggle the expanded state for the clicked job item
        setState(prevState => ({
            ...prevState,
            expanded: {
                ...prevState.expanded,
                [id]: !prevState.expanded[id], // Toggle the state
                JobsList: newItems
            }
        }));
    }

    // User handle when the user change the states changes
    const userHandler = async (event: any) => {
        const spHR = state.spHR
        if (event.length > 0) {
            const userEmail = event[0].secondaryText
            spHR?.web.siteUsers.getByEmail(userEmail)().then((user: any) => {
                setState(prevState => ({
                    ...prevState,
                    currUser: user,
                    applicantNameId: user.Id
                }))
            }).catch((e: Error) => console.error(e))
        }
    }

    const getUser = async (id: number) => {
        const user = await sp.web.siteUsers.getById(id)()
        return user.Title
    }

    const validateForm = (): boolean => {
        const { email, phone, employeeName } = state.ApplicantState;

        // Reset validation errors
        setState(prevState => ({
            ...prevState,
            emailValidationError: false,
            phoneValidationError: false,
            employeeNameValidationError: false
        }));

        let isValid = true;

        // Email validation
        const regexEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (email === "" || email === undefined || !regexEmail.test(String(email).toLowerCase())) {
            isValid = false;
            setState(prevState => ({
                ...prevState,
                emailValidationError: true
            }));
        }

        // Phone validation
        const regexPhone = /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/;
        if (phone === "" || phone === undefined || !regexPhone.test(String(phone).replace(/[\s\-\.]/g, ''))) {
            isValid = false;
            setState(prevState => ({
                ...prevState,
                phoneValidationError: true
            }));
        }

        // EmployeeName validation
        if (employeeName === "" || employeeName === undefined) {
            isValid = false;
            setState(prevState => ({
                ...prevState,
                employeeNameValidationError: true
            }));
        }

        return isValid;
    }


    const onSubmitHandler = async (item?: any) => {
        if (validateForm()) {
            setState(prevState => ({
                ...prevState,
                isSaving: true
            }));

            // const spHR = state.spHR

            // First, attempt to add the item
            const addItemResult = await sp.web.lists.getById(JobsApplicationsListId).items.add({
                jobName: item.jobName,
                inchargeRecruiterNameId: item.inchargeRecruiterNameId,
                requiredExprience: String(item.exprience).toString(),
                jobType: item.jobType,
                employeeName: state.ApplicantState.employeeName,
                email: state.ApplicantState.email,
                phone: state.ApplicantState.phone,
                notes: state.ApplicantState.notes,
                applicantNameId: state.currUser.Id
            });

            if (state.filesList.length) {

                const file = state.filesList[0]
                // If the item is added successfully, then try to add the attachment

                const addAttach = await sp.web.lists.getById(JobsApplicationsListId).items.getById(addItemResult?.data.Id).attachmentFiles
                    .add(file.name, file.objFile);
                Promise.all([addItemResult, addAttach]).then(() => {
                    handleClose();
                    Swal.fire({
                        title: "המשרה הוגשה בהצלחה!",
                        icon: "success"
                    });
                })
            }
            handleClose();
            Swal.fire({
                title: "המשרה הוגשה בהצלחה!",
                icon: "success"
            });
        }
        setState(prevState => ({
            ...prevState,
            isSaving: false
        }));
    }


    const uploadFiles = (e: any) => {
        e.preventDefault();
        const avi = require('../../assets/Graphicloads-Filetype-Avi.256.png')
        const cdr = require('../../assets/Graphicloads-Filetype-Coreldraw-cdr.256.png')
        const csv = require('../../assets/Graphicloads-Filetype-Csv.256.png')
        const excel = require('../../assets/Graphicloads-Filetype-Excel-xls.256.png')
        const jpg = require('../../assets/Graphicloads-Filetype-Jpg.256.png')
        const mp3 = require('../../assets/Graphicloads-Filetype-Mp3.256.png')
        const pdf = require('../../assets/Graphicloads-Filetype-Pdf.256.png')
        const png = require('../../assets/Graphicloads-Filetype-Png.256.png')
        const ppt = require('../../assets/Graphicloads-Filetype-Ppt.256.png')
        const rar = require('../../assets/Graphicloads-Filetype-Rar.256.png')
        const txt = require('../../assets/Graphicloads-Filetype-Txt.256.png')
        const word = require('../../assets/Graphicloads-Filetype-Word-doc.256.png')
        const zip = require('../../assets/Graphicloads-Filetype-Zip.256.png')


        const selectedFiles = e.target.files;
        const extension = selectedFiles[0].name.split(".").pop().toLowerCase();
        let icon;
        let color;

        switch (extension) {
            case "avi":
                icon = avi;
                color = '#f59d36'
                break;
            case "cdr":
                icon = cdr;
                color = '#4974a1'
                break;
            case "csv":
                icon = csv;
                color = '#3fcadf'
                break;
            case "xls":
            case "xlsx": // Adding support for both .xls and .xlsx
                icon = excel;
                color = '#7fae68'
                break;
            case "jpg":
            case "jpeg": // Adding support for both .jpg and .jpeg
                icon = jpg;
                color = '#e78946'
                break;
            case "mp3":
                icon = mp3;
                color = '#00b69e'
                break;
            case "pdf":
                icon = pdf;
                color = '#e24349'
                break;
            case "png":
                icon = png;
                color = '#e34375'
                break;
            case "ppt":
            case "pptx": // Adding support for both .ppt and .pptx
                icon = ppt;
                color = '#00c6ca'
                break;
            case "rar":
                icon = rar;
                color = '#49b975'
                break;
            case "txt":
                icon = txt;
                color = '#95a5a5'
                break;
            case "doc":
            case "docx": // Adding support for both .doc and .docx
                icon = word;
                color = '#2955a6'
                break;
            case "zip":
                icon = zip;
                color = '#f37173'
                break;
            default:
                icon = ""; // Default icon or action if file type is not recognized
                color = "#757575"
        }

        let fileSizeBytes = selectedFiles[0].size

        const sizeInKB = fileSizeBytes / 1024;
        const sizeInMB = fileSizeBytes / (1024 * 1024);
        const sizeInGB = fileSizeBytes / (1024 * 1024 * 1024);

        if (sizeInGB >= 1) {
            fileSizeBytes = `${sizeInGB.toFixed(2)} GB`;
        } else if (sizeInMB >= 1) {
            fileSizeBytes = `${sizeInMB.toFixed(2)} MB`;
        } else if (sizeInKB >= 1) {
            fileSizeBytes = `${sizeInKB.toFixed(2)} KB`;
        } else {
            fileSizeBytes = `${fileSizeBytes} bytes`;
        }

        const file = {
            name: selectedFiles[0]?.name,
            size: fileSizeBytes,
            icon: icon,
            color: color,
            objFile: selectedFiles[0],
            extension: extension
        }

        setState(prevState => ({
            ...prevState,
            filesList: [file]
        }));
    }

    /** Styles */

    const styleModal = {
        position: 'absolute' as 'relative',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '40%',
        bgcolor: 'background.paper',
        borderRadius: '5px',
        boxShadow: 24,
        // p: 40,
    };

    const heightTextFieldsStyle = {
        height: "1em",
        maxHeight: '10em'
    }

    // Calculate start and end index of items on the current page
    const indexOfLastItem = currentPage * pageItemsNumber;
    const indexOfFirstItem = indexOfLastItem - pageItemsNumber;
    const currentItems = state.filteredJobs.slice(indexOfFirstItem, indexOfLastItem);

    return (

        <div className="EONewFormContainer">

            <div className="EOHeader">
                <div className="EOHeaderContainer">
                    <span className="EOHeaderText">{Title}</span>
                </div>
                <div className="EOLogoContainer"></div>
            </div>
            {state.isLoading ? (
                <div className="SpinnerComp">
                    <div className="loading-screen">
                        <div className="loader-wrap">
                            <span className="loader-animation"></span>
                            <div className="loading-text">
                                <span className="letter">ב</span>
                                <span className="letter">ט</span>
                                <span className="letter">ע</span>
                                <span className="letter">י</span>
                                <span className="letter">נ</span>
                                <span className="letter">ה</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) :

                <div className={styles.jobsListContainer}>
                    <TextField
                        id=""
                        label=""
                        onChange={(e) => onChangeSearch(e)}
                        type='search'
                        placeholder='חפש משרה...'
                        fullWidth
                        style={{ width: '20%' }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {currentItems.length > 0 ? currentItems.map((item) => (
                        <div className={`${styles.jobItem}`} key={item.ID}>
                            <div className={styles.details}>

                                <div className={styles.LineContainer}>
                                    <img className={styles.Tags} src={require('../../assets/SuitCase.svg')} alt=''></img>
                                    <h2>{item.jobName}</h2>
                                </div>
                                <div className={styles.LineContainer}>
                                    <p className={styles.Tags}>{item.exprience} שנות ניסיון</p>
                                    <p className={styles.Tags}>משרה {item.jobType}</p>
                                </div>

                                <div className={styles.LineContainer} style={{ gridArea: "Lheader" }}>
                                    <img src={require('../../assets/Contact.svg')}></img>
                                    <p>{state.userDetails[item.ID]}</p>
                                </div>
                                <Button style={{ gridArea: "Lfooter", borderRadius: '30px', width: 'fit-content', height: 'max-content' }} size='large' onClick={() => handleOpen(item.ID)} variant="contained" color="primary">
                                    שליחת קו"ח
                                </Button>

                            </div>
                            <div className={styles.BtsAndTextContainer}>
                                <div className={styles.switchBts}>
                                    <Button
                                        style={{ borderRadius: '30px', width: 'fit-content', height: 'max-content' }}
                                        size='large'
                                        variant={state.activeButtons[item.ID] === 'jobDescription' ? "contained" : "outlined"}
                                        color="primary"
                                        onClick={() => handleButtonClick(item.ID, 'jobDescription')}
                                    >
                                        תיאור המשרה
                                    </Button>
                                    <Button
                                        style={{ borderRadius: '30px', width: 'fit-content', height: 'max-content' }}
                                        size='large'
                                        variant={state.activeButtons[item.ID] === 'jobRequirements' ? "contained" : "outlined"}
                                        color="primary"
                                        onClick={() => handleButtonClick(item.ID, 'jobRequirements')}
                                    >
                                        דרישות התפקיד
                                    </Button>
                                    <Button
                                        style={{ borderRadius: '30px', width: 'fit-content', height: 'max-content' }}
                                        size='large'
                                        variant={state.activeButtons[item.ID] === 'emphasis' ? "contained" : "outlined"}
                                        color="primary"
                                        onClick={() => handleButtonClick(item.ID, 'emphasis')}
                                    >
                                        דגשים
                                    </Button>
                                </div>

                                <Collapse in={state.expanded[item.ID]} collapsedSize={0}>
                                    <div style={{ overflowX: 'scroll', overflowY: 'hidden' }}>
                                        <div
                                            dangerouslySetInnerHTML={{ __html: state.CollapseText[item.ID] }}
                                        ></div>
                                    </div>
                                </Collapse>

                            </div>

                            <p style={{ display: "flex", justifyContent: "center" }} >{''}
                                <span className={styles.readMore} onClick={() => toggleExpand(item.ID)}>{item.isExpanded === true ? <KeyboardArrowUpIcon fontSize='large' /> : <KeyboardArrowDownIcon fontSize='large' />}</span>
                            </p>

                            <Modal open={openModalJobId === item.ID}
                                onClose={handleClose}
                                aria-labelledby="modal-modal-title"
                                aria-describedby="modal-modal-description"

                            >

                                <Box sx={styleModal}>
                                    <div className={styles.FormTitle}>
                                        <Typography color="primary" variant="h4">
                                            הגש משרה
                                        </Typography>
                                        <IconButton edge="start" aria-label="delete" >
                                            <CloseIcon fontSize="large" color="disabled" onClick={handleClose} sx={{ cursor: "pointer" }} />
                                        </IconButton>
                                    </div>
                                    <Divider></Divider>
                                    <div className={styles.ModalContainer}>
                                        <div className={styles.ModalRow}>
                                            <Typography id="modal-modal-title" variant="subtitle1" color='GrayText' fontStyle='inherit' component="h6">שם המשרה:</Typography>
                                            <TextField
                                                type='input'
                                                value={item?.jobName}
                                                size='small'
                                                fullWidth
                                                disabled
                                                inputProps={{ style: heightTextFieldsStyle }}
                                                FormHelperTextProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
                                            />
                                        </div>
                                        <div className={styles.ModalRow}>
                                            <Typography id="modal-modal-title" variant="subtitle1" color='GrayText' fontStyle='inherit' component="h6">שם מגיש הבקשה:</Typography>
                                            <PeoplePicker
                                                context={context}
                                                personSelectionLimit={1}
                                                showtooltip={false}
                                                required
                                                defaultSelectedUsers={[state.currUser && state.currUser.Email]}
                                                onChange={(event) => userHandler(event)}
                                                principalTypes={[1]}
                                                peoplePickerCntrlclassName={styles.PeoplePicker}
                                                styles={{
                                                    root: {
                                                        selectors: {
                                                            [`& .ms-PickerPersona-container:target`]: {
                                                                background: "red",
                                                            },
                                                        },
                                                    },
                                                }}
                                            />
                                        </div>
                                        <div className={styles.ModalRow}>

                                            <Typography id="modal-modal-title" variant="subtitle1" color='GrayText' fontStyle='inherit' component="h6"> <span style={{ color: 'red' }}>*</span> שם המועמד:</Typography>
                                            <TextField
                                                defaultValue={""}
                                                name='employeeName'
                                                type='input'
                                                value={state.ApplicantState.employeeName}
                                                onChange={onChange}
                                                size='small'
                                                fullWidth
                                                required
                                                error={state.employeeNameValidationError}
                                                helperText={state.employeeNameValidationError ? 'נא למלא את כל שדות החובה' : ""}
                                                inputProps={{ style: heightTextFieldsStyle }}
                                                FormHelperTextProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
                                            />
                                        </div>
                                        <div className={styles.ModalRow}>

                                            <Typography id="modal-modal-title" variant="subtitle1" color='GrayText' fontStyle='inherit' component="h6"> <span style={{ color: 'red' }}>*</span> אימייל:</Typography>
                                            <TextField
                                                defaultValue={""}
                                                name='email'
                                                type='email'
                                                value={state.ApplicantState.email}
                                                onChange={onChange}
                                                size='small'
                                                fullWidth
                                                error={state.emailValidationError}
                                                helperText={state.emailValidationError ? 'נא למלא את כל שדות החובה' : ""}
                                                inputProps={{ style: heightTextFieldsStyle }}
                                                FormHelperTextProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
                                            />
                                        </div>
                                        <div className={styles.ModalRow}>

                                            <Typography id="modal-modal-title" variant="subtitle1" color='GrayText' fontStyle='inherit' component="h6"><span style={{ color: 'red' }}>*</span> טלפון:</Typography>
                                            <TextField
                                                defaultValue={""}
                                                name='phone'
                                                type='tel'
                                                value={state.ApplicantState.phone}
                                                onChange={onChange}
                                                size='small'
                                                fullWidth
                                                error={state.phoneValidationError}
                                                helperText={state.phoneValidationError ? 'נא למלא את כל שדות החובה' : ""}
                                                inputProps={{ style: heightTextFieldsStyle }}
                                                FormHelperTextProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
                                            />
                                        </div>
                                        <div className={styles.ModalRow}>

                                            <Typography id="modal-modal-title" variant="subtitle1" color='GrayText' fontStyle='inherit' component="h6">הערות:</Typography>
                                            <TextField
                                                defaultValue={""}
                                                name='notes'
                                                value={state.ApplicantState.notes}
                                                type="text"
                                                multiline
                                                maxRows={4}
                                                onChange={onChange}
                                                size='small'
                                                fullWidth
                                                FormHelperTextProps={{ dir: 'rtl', style: { textAlign: 'right' } }}
                                            // inputProps={{ style: heightTextFieldsStyle }}
                                            />
                                        </div>
                                        <div className={styles.ModalRow}>

                                            <Typography id="modal-modal-title" variant="subtitle1" color='GrayText' fontStyle='inherit' component="h6">קבצים מצורפים:</Typography>

                                            {state.filesList.length > 0 && (
                                                <List dense={true}>
                                                    {state.filesList.map((file, index) => (
                                                        <ListItem key={index} style={{ border: '1px solid #DCDCDC', borderRadius: '10px', padding: 0, gap: '0.5em', height: '70px' }} secondaryAction={
                                                            <IconButton aria-label="comment">
                                                                <DeleteOutlineIcon onClick={() => {
                                                                    setState(prevState => ({
                                                                        ...prevState,
                                                                        filesList: []
                                                                    }))
                                                                }} />
                                                            </IconButton>

                                                        }>
                                                            <ListItemText dir='ltr' primary={file?.name.length > 20 ? file.name.substring(0, 25) + `...${file?.extension}` : file?.name} secondary={`File size: ${file?.size.toLocaleString()}`} />
                                                            {file?.icon === "" ? <ListItemAvatar>
                                                                <Avatar>
                                                                    <FolderIcon />
                                                                </Avatar>
                                                            </ListItemAvatar> : <img style={{ width: '4.25rem', height: '100%', borderRadius: '8px 0 0 8px', backgroundColor: file?.color }} src={file?.icon} alt='' />}
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            )}
                                            <Button
                                                variant="outlined"
                                                component="label"
                                                color='primary'
                                                endIcon={
                                                    <AttachFileIcon
                                                        color="primary"
                                                        style={{ transform: "rotate(45deg)" }}
                                                    />
                                                }
                                                className={styles.UploadFileBtn}
                                                size="large"
                                            >
                                                <span
                                                    className={styles.FileName}
                                                >
                                                    העלאת קבצים
                                                </span>
                                                <input
                                                    type="file"
                                                    name="Attachment"
                                                    onChange={(e) => uploadFiles(e)}
                                                    hidden
                                                />
                                            </Button>
                                        </div>
                                        <Divider />
                                        <div style={{ display: 'flex', justifyContent: "flex-end", width: '100%' }}>

                                            <Button onClick={() => onSubmitHandler(item)} style={{ borderRadius: '30px', width: '10em', height: '3em', margin: '1em' }} size='large' variant="contained" color="primary">
                                                {state.isSaving ? "בטעינה..." : "הגש בקשה"}
                                            </Button>
                                        </div>
                                    </div>

                                </Box>
                            </Modal>
                        </div>
                    )) : <p>אין תוצאות</p>}

                    <Pagination page={currentPage}
                        onChange={handlePageChange}
                        count={Math.ceil(state.filteredJobs.length / pageItemsNumber)}
                        variant="outlined"
                        shape="rounded"
                        dir='ltr'
                        style={{ paddingBottom: "1em" }}
                    />
                </div>
            }
        </div>
    );
}
